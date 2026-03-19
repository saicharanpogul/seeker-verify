import { Connection } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  SKR_MINT_ADDRESS,
  SKR_CACHE_TTL,
  SKR_CLAIM_PROGRAM_ID,
} from "./constants";
import { SKRBalance, SKRStakeInfo, WalletAddress } from "./types";
import { RpcError } from "./errors";
import { validateAndParseAddress } from "./utils";
import { LRUCache } from "./cache";

const balanceCache = new LRUCache<SKRBalance>({
  maxSize: 500,
  ttlSeconds: SKR_CACHE_TTL,
});

/** SKR token decimals */
const SKR_DECIMALS = 6;

/**
 * Get the SKR token balance for a wallet.
 *
 * Queries the associated token account for the SKR mint and returns
 * both the raw balance and the human-readable UI amount.
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to query
 * @param options - Optional cache settings
 * @returns SKR balance information
 * @throws {InvalidAddressError} If the wallet address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const balance = await getSKRBalance(connection, walletAddress);
 * console.log(`SKR Balance: ${balance.uiBalance}`);
 * ```
 */
export async function getSKRBalance(
  connection: Connection,
  walletAddress: WalletAddress,
  options?: { cache?: boolean }
): Promise<SKRBalance> {
  const pubkey = validateAndParseAddress(walletAddress);
  const walletStr = pubkey.toBase58();
  const useCache = options?.cache ?? true;

  if (useCache) {
    const cached = balanceCache.get(walletStr);
    if (cached) return cached;
  }

  try {
    const ata = getAssociatedTokenAddressSync(SKR_MINT_ADDRESS, pubkey);
    const account = await getAccount(connection, ata);
    const balance = Number(account.amount);
    const uiBalance = balance / Math.pow(10, SKR_DECIMALS);

    const result: SKRBalance = {
      balance,
      uiBalance,
      walletAddress: walletStr,
    };

    if (useCache) balanceCache.set(walletStr, result);
    return result;
  } catch (err) {
    // TokenAccountNotFoundError means the wallet has no SKR
    const errorName = (err as { name?: string })?.name;
    if (
      errorName === "TokenAccountNotFoundError" ||
      errorName === "TokenInvalidAccountOwnerError"
    ) {
      const result: SKRBalance = {
        balance: 0,
        uiBalance: 0,
        walletAddress: walletStr,
      };
      if (useCache) balanceCache.set(walletStr, result);
      return result;
    }
    throw new RpcError("Failed to fetch SKR token balance", err);
  }
}

/**
 * Get SKR staking information for a wallet.
 *
 * Queries the SKR claim program (mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv)
 * for claim accounts associated with the wallet. Claim accounts track the total
 * amount of SKR staked/claimed by a user.
 *
 * Account layout (64 bytes):
 * - [0..8]   Anchor discriminator
 * - [8..40]  Wallet public key
 * - [40..48] Locked amount (u64)
 * - [48..56] Unlocked/claimed amount (u64)
 * - [56..64] Total staked amount (u64)
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to query
 * @returns SKR staking information
 * @throws {InvalidAddressError} If the wallet address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const stakeInfo = await getSKRStakeInfo(connection, walletAddress);
 * if (stakeInfo.isStaked) {
 *   console.log(`Staked: ${stakeInfo.stakedUiAmount} SKR`);
 * }
 * ```
 */
export async function getSKRStakeInfo(
  connection: Connection,
  walletAddress: WalletAddress
): Promise<SKRStakeInfo> {
  const pubkey = validateAndParseAddress(walletAddress);
  const walletStr = pubkey.toBase58();

  try {
    // Query claim program for 64-byte accounts matching this wallet at offset 8
    // (after the 8-byte Anchor discriminator)
    const accounts = await connection.getProgramAccounts(SKR_CLAIM_PROGRAM_ID, {
      filters: [
        { dataSize: 64 },
        { memcmp: { offset: 8, bytes: pubkey.toBase58() } },
      ],
    });

    if (accounts.length === 0) {
      return {
        stakedAmount: 0,
        stakedUiAmount: 0,
        isStaked: false,
        walletAddress: walletStr,
      };
    }

    // Sum up staked amounts across all claim accounts
    let totalStaked = BigInt(0);

    for (const account of accounts) {
      const data = account.account.data;
      if (data.length >= 64) {
        // Total staked amount is at offset 56 (u64 little-endian)
        const amount = data.readBigUInt64LE(56);
        totalStaked += amount;
      }
    }

    const stakedAmount = Number(totalStaked);
    const stakedUiAmount = stakedAmount / Math.pow(10, SKR_DECIMALS);

    return {
      stakedAmount,
      stakedUiAmount,
      isStaked: totalStaked > BigInt(0),
      walletAddress: walletStr,
    };
  } catch (err) {
    if (err instanceof RpcError) throw err;
    throw new RpcError("Failed to fetch SKR staking info", err);
  }
}

/**
 * Check if a wallet holds at least a minimum amount of SKR tokens.
 *
 * Useful for token-gating features behind a minimum SKR holding.
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to check
 * @param minAmount - Minimum amount in UI units (not lamports)
 * @returns Whether the wallet holds at least the specified amount
 * @throws {InvalidAddressError} If the wallet address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * // Gate feature behind 100 SKR minimum
 * if (await hasMinSKR(connection, walletAddress, 100)) {
 *   console.log("Access granted!");
 * }
 * ```
 */
export async function hasMinSKR(
  connection: Connection,
  walletAddress: WalletAddress,
  minAmount: number
): Promise<boolean> {
  const balance = await getSKRBalance(connection, walletAddress);
  return balance.uiBalance >= minAmount;
}
