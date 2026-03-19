import { Connection } from "@solana/web3.js";
import type { SeekerProfile, WalletAddress } from "./types";
import { validateAndParseAddress } from "./utils";
import { verifySGT } from "./sgt";
import { reverseResolveSkr } from "./skr-domains";
import { getSKRBalance, getSKRStakeInfo } from "./skr-token";

// ── SGT ─────────────────────────────────────────────────────────────────
export { verifySGT, isSeeker, getSGTDetails } from "./sgt";

// ── .skr domains ────────────────────────────────────────────────────────
export {
  resolveSkrDomain,
  reverseResolveSkr,
  isSkrDomain,
  getSkrDomains,
} from "./skr-domains";

// ── SKR token ───────────────────────────────────────────────────────────
export { getSKRBalance, getSKRStakeInfo, hasMinSKR } from "./skr-token";

// ── Guardian pools ──────────────────────────────────────────────────────
export {
  getGuardianPool,
  getGuardiansForStaker,
  getAllGuardians,
} from "./guardian";

// ── Staking stats ───────────────────────────────────────────────────────
export { getStakingStats } from "./staking-stats";

// ── Instruction builders ────────────────────────────────────────────────
export {
  createStakeInstruction,
  createUnstakeInstruction,
  createCancelUnstakeInstruction,
  createWithdrawInstruction,
} from "./instructions";

// ── PDA derivation helpers ──────────────────────────────────────────────
export {
  deriveStakeConfigPda,
  deriveUserStakePda,
  deriveGuardianPoolPda,
  deriveStakeVaultPda,
  deriveEventAuthorityPda,
} from "./pda";

// ── Utilities ───────────────────────────────────────────────────────────
export { LRUCache } from "./cache";

// ── Types ───────────────────────────────────────────────────────────────
export type {
  SGTResult,
  SGTVerifyOptions,
  SkrDomainResult,
  SKRBalance,
  SKRStakeInfo,
  SeekerProfile,
  GuardianPool,
  StakingStats,
  CacheOptions,
  CacheConfig,
  WalletAddress,
} from "./types";
export { toWalletString, toPublicKey } from "./types";

// ── Errors ──────────────────────────────────────────────────────────────
export {
  SeekerVerifyError,
  SGTVerificationError,
  DomainResolutionError,
  InvalidAddressError,
  RpcError,
} from "./errors";

// ── Constants ───────────────────────────────────────────────────────────
export {
  SGT_MINT_AUTHORITY,
  SGT_METADATA_ADDRESS,
  SGT_GROUP_MINT_ADDRESS,
  TOKEN_2022_PROGRAM_ID,
  SKR_MINT_ADDRESS,
  SKR_STAKING_PROGRAM_ID,
  SKR_STAKE_CONFIG,
  SHARE_PRECISION,
  SKR_TLD,
} from "./constants";

// ── Aggregate ───────────────────────────────────────────────────────────

/**
 * Get a complete Seeker profile for a wallet address.
 *
 * Queries SGT verification, .skr domain, SKR balance, and staking status
 * in parallel. Uses `Promise.allSettled` so partial failures don't break
 * the entire response.
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to query
 * @returns Aggregate Seeker profile with all available data
 * @throws {InvalidAddressError} If the wallet address is invalid
 *
 * @example
 * ```typescript
 * const profile = await getSeekerProfile(connection, walletAddress);
 * console.log(`Seeker: ${profile.isSeeker}`);
 * console.log(`Staked: ${profile.stakedAmount} SKR`);
 * console.log(`Yield: ${profile.yieldEarned} SKR`);
 * ```
 */
export async function getSeekerProfile(
  connection: Connection,
  walletAddress: WalletAddress
): Promise<SeekerProfile> {
  const pubkey = validateAndParseAddress(walletAddress);
  const walletStr = pubkey.toBase58();

  const [sgtResult, domainResult, balanceResult, stakeResult] =
    await Promise.allSettled([
      verifySGT({ connection, walletAddress: pubkey }),
      reverseResolveSkr(connection, pubkey),
      getSKRBalance(connection, pubkey),
      getSKRStakeInfo(connection, pubkey),
    ]);

  const stakeData =
    stakeResult.status === "fulfilled" ? stakeResult.value : null;

  return {
    walletAddress: walletStr,
    isSeeker:
      sgtResult.status === "fulfilled" ? sgtResult.value.isSeeker : false,
    sgtMintAddress:
      sgtResult.status === "fulfilled"
        ? sgtResult.value.mintAddress
        : null,
    skrDomain:
      domainResult.status === "fulfilled" ? domainResult.value : null,
    skrBalance:
      balanceResult.status === "fulfilled"
        ? balanceResult.value.uiBalance
        : 0,
    isStaked: stakeData?.isStaked ?? false,
    stakedAmount: stakeData?.currentAmount ?? 0,
    yieldEarned: stakeData?.yieldEarned ?? 0,
  };
}
