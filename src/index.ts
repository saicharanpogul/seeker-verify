import { Connection } from "@solana/web3.js";
import type { SeekerProfile, WalletAddress } from "./types";
import { validateAndParseAddress } from "./utils";
import { verifySGT } from "./sgt";
import { reverseResolveSkr } from "./skr-domains";
import { getSKRBalance, getSKRStakeInfo } from "./skr-token";

// Re-export all public API
export { verifySGT, isSeeker, getSGTDetails } from "./sgt";
export {
  resolveSkrDomain,
  reverseResolveSkr,
  isSkrDomain,
  getSkrDomains,
} from "./skr-domains";
export { getSKRBalance, getSKRStakeInfo, hasMinSKR } from "./skr-token";
export { LRUCache } from "./cache";

// Re-export types
export type {
  SGTResult,
  SGTVerifyOptions,
  SkrDomainResult,
  SKRBalance,
  SKRStakeInfo,
  SeekerProfile,
  CacheOptions,
  CacheConfig,
  WalletAddress,
} from "./types";
export { toWalletString, toPublicKey } from "./types";

// Re-export errors
export {
  SeekerVerifyError,
  SGTVerificationError,
  DomainResolutionError,
  InvalidAddressError,
  RpcError,
} from "./errors";

// Re-export constants
export {
  SGT_MINT_AUTHORITY,
  SGT_METADATA_ADDRESS,
  SGT_GROUP_MINT_ADDRESS,
  TOKEN_2022_PROGRAM_ID,
  SKR_MINT_ADDRESS,
  SKR_STAKING_PROGRAM_ID,
  SKR_CLAIM_PROGRAM_ID,
  SKR_TLD,
} from "./constants";

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
 * console.log(`Domain: ${profile.skrDomain}`);
 * console.log(`SKR Balance: ${profile.skrBalance}`);
 * ```
 */
export async function getSeekerProfile(
  connection: Connection,
  walletAddress: WalletAddress
): Promise<SeekerProfile> {
  // Validate address up front before parallel queries
  const pubkey = validateAndParseAddress(walletAddress);
  const walletStr = pubkey.toBase58();

  const [sgtResult, domainResult, balanceResult, stakeResult] =
    await Promise.allSettled([
      verifySGT({ connection, walletAddress: pubkey }),
      reverseResolveSkr(connection, pubkey),
      getSKRBalance(connection, pubkey),
      getSKRStakeInfo(connection, pubkey),
    ]);

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
    isStaked:
      stakeResult.status === "fulfilled"
        ? stakeResult.value.isStaked
        : false,
  };
}
