import { Connection } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  SKR_MINT_ADDRESS,
  SKR_CACHE_TTL,
  SKR_STAKING_PROGRAM_ID,
  SKR_STAKE_CONFIG,
  SHARE_PRECISION,
  USER_STAKE_ACCOUNT_SIZE,
  USER_STAKE_USER_OFFSET,
  USER_STAKE_SHARES_OFFSET,
  USER_STAKE_COST_BASIS_OFFSET,
  USER_STAKE_UNSTAKING_OFFSET,
  STAKE_CONFIG_SHARE_PRICE_OFFSET,
} from "./constants";
import { SKRBalance, SKRStakeInfo, WalletAddress } from "./types";
import { RpcError } from "./errors";
import { validateAndParseAddress, readU128LE } from "./utils";
import { LRUCache } from "./cache";

const balanceCache = new LRUCache<SKRBalance>({
  maxSize: 500,
  ttlSeconds: SKR_CACHE_TTL,
});

/** SKR token decimals */
const SKR_DECIMALS = 6;
const SKR_DIVISOR = Math.pow(10, SKR_DECIMALS);

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
    const uiBalance = balance / SKR_DIVISOR;

    const result: SKRBalance = {
      balance,
      uiBalance,
      walletAddress: walletStr,
    };

    if (useCache) balanceCache.set(walletStr, result);
    return result;
  } catch (err) {
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
 * Queries the on-chain UserStake accounts (PDA seeds: `["user_stake", stake_config,
 * user, guardian_pool]`) from the SKR staking program to determine shares held.
 * Fetches the current share price from the StakeConfig account to compute
 * the current value and yield.
 *
 * UserStake account layout (169 bytes):
 * - [0..8]    Anchor discriminator
 * - [8]       bump (u8)
 * - [9..41]   stake_config (pubkey)
 * - [41..73]  user (pubkey)
 * - [73..105] guardian_pool (pubkey)
 * - [105..121] shares (u128)
 * - [121..137] cost_basis (u128)
 * - [137..153] cumulative_commission_before_staking (u128)
 * - [153..161] unstaking_amount (u64)
 * - [161..169] unstake_timestamp (i64)
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to query
 * @returns SKR staking information including deposited amount, current value, and yield
 * @throws {InvalidAddressError} If the wallet address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const stakeInfo = await getSKRStakeInfo(connection, walletAddress);
 * if (stakeInfo.isStaked) {
 *   console.log(`Deposited: ${stakeInfo.depositedAmount} SKR`);
 *   console.log(`Current: ${stakeInfo.currentAmount} SKR`);
 *   console.log(`Yield: ${stakeInfo.yieldEarned} SKR`);
 * }
 * ```
 */
export async function getSKRStakeInfo(
  connection: Connection,
  walletAddress: WalletAddress
): Promise<SKRStakeInfo> {
  const pubkey = validateAndParseAddress(walletAddress);
  const walletStr = pubkey.toBase58();

  const emptyResult: SKRStakeInfo = {
    isStaked: false,
    depositedAmount: 0,
    currentAmount: 0,
    yieldEarned: 0,
    unstakingAmount: 0,
    walletAddress: walletStr,
  };

  try {
    // Find all UserStake accounts for this wallet (user field at offset 41)
    const userStakeAccounts = await connection.getProgramAccounts(
      SKR_STAKING_PROGRAM_ID,
      {
        filters: [
          { dataSize: USER_STAKE_ACCOUNT_SIZE },
          { memcmp: { offset: USER_STAKE_USER_OFFSET, bytes: pubkey.toBase58() } },
        ],
      }
    );

    if (userStakeAccounts.length === 0) return emptyResult;

    // Fetch current share price from StakeConfig
    const configInfo = await connection.getAccountInfo(SKR_STAKE_CONFIG);
    if (!configInfo) return emptyResult;

    const sharePrice = readU128LE(
      configInfo.data as Buffer,
      STAKE_CONFIG_SHARE_PRICE_OFFSET
    );

    // Aggregate across all UserStake accounts (user may stake to multiple guardians)
    let totalShares = 0n;
    let totalDeposited = 0n;
    let totalUnstaking = 0n;

    for (const account of userStakeAccounts) {
      const data = account.account.data as Buffer;
      const shares = readU128LE(data, USER_STAKE_SHARES_OFFSET);
      const costBasis = readU128LE(data, USER_STAKE_COST_BASIS_OFFSET);
      const unstaking = data.readBigUInt64LE(USER_STAKE_UNSTAKING_OFFSET);

      totalShares += shares;
      totalDeposited += (shares * costBasis) / SHARE_PRECISION;
      totalUnstaking += unstaking;
    }

    const currentValueRaw = (totalShares * sharePrice) / SHARE_PRECISION;
    const yieldRaw = currentValueRaw - totalDeposited;

    const depositedAmount = Number(totalDeposited) / SKR_DIVISOR;
    const currentAmount = Number(currentValueRaw) / SKR_DIVISOR;
    const yieldEarned = Number(yieldRaw) / SKR_DIVISOR;
    const unstakingAmount = Number(totalUnstaking) / SKR_DIVISOR;

    return {
      isStaked: totalShares > 0n,
      depositedAmount,
      currentAmount,
      yieldEarned,
      unstakingAmount,
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
