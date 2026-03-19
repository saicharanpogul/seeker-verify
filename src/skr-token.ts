import { Connection } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SKR_MINT_ADDRESS, SKR_CACHE_TTL } from "./constants";
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
 * The SKR staking program (SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ) does
 * not maintain persistent per-user stake accounts on-chain — the stake deposit
 * receipt is created and closed within the staking transaction. Because of this,
 * individual staked amounts cannot be reliably queried from on-chain state alone.
 *
 * This function currently returns `isStaked: false` as a placeholder.
 * It will be updated if the staking program adds queryable per-user accounts
 * or if an indexer/API becomes available.
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to query
 * @returns SKR staking information
 * @throws {InvalidAddressError} If the wallet address is invalid
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

  void connection;

  return {
    stakedAmount: 0,
    stakedUiAmount: 0,
    isStaked: false,
    walletAddress: walletStr,
  };
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
