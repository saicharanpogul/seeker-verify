import { Connection, PublicKey } from "@solana/web3.js";
import {
  SKR_STAKE_CONFIG,
  STAKE_CONFIG_VAULT_OFFSET,
  STAKE_CONFIG_MIN_STAKE_OFFSET,
  STAKE_CONFIG_COOLDOWN_OFFSET,
  STAKE_CONFIG_TOTAL_SHARES_OFFSET,
  STAKE_CONFIG_SHARE_PRICE_OFFSET,
  SHARE_PRECISION,
  GUARDIAN_POOL_ACCOUNT_SIZE,
  GUARDIAN_POOL_ACTIVE_OFFSET,
  SKR_STAKING_PROGRAM_ID,
  STAKING_STATS_CACHE_TTL,
} from "./constants";
import { StakingStats } from "./types";
import { RpcError } from "./errors";
import { readU128LE } from "./utils";
import { LRUCache } from "./cache";

const SKR_DECIMALS = 6;
const SKR_DIVISOR = Math.pow(10, SKR_DECIMALS);

const statsCache = new LRUCache<StakingStats>({
  maxSize: 1,
  ttlSeconds: STAKING_STATS_CACHE_TTL,
});

/**
 * Get global SKR staking statistics.
 *
 * Fetches the StakeConfig account and parses total shares, share price,
 * cooldown period, minimum stake, and counts active guardian pools.
 *
 * @param connection - Solana RPC connection
 * @returns Global staking statistics
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const stats = await getStakingStats(connection);
 * console.log(`Share price: ${stats.sharePriceMultiplier}x`);
 * console.log(`TVL: ${stats.totalValueLocked} SKR`);
 * console.log(`Guardians: ${stats.guardianCount}`);
 * ```
 */
export async function getStakingStats(
  connection: Connection
): Promise<StakingStats> {
  const cached = statsCache.get("stats");
  if (cached) return cached;

  try {
    // Fetch StakeConfig and guardian count in parallel
    const [configInfo, guardianAccounts] = await Promise.all([
      connection.getAccountInfo(SKR_STAKE_CONFIG),
      connection.getProgramAccounts(SKR_STAKING_PROGRAM_ID, {
        filters: [{ dataSize: GUARDIAN_POOL_ACCOUNT_SIZE }],
        dataSlice: { offset: GUARDIAN_POOL_ACTIVE_OFFSET, length: 1 },
      }),
    ]);

    if (!configInfo) {
      throw new RpcError("StakeConfig account not found");
    }

    const data = configInfo.data as Buffer;

    const vaultAddress = new PublicKey(
      data.slice(STAKE_CONFIG_VAULT_OFFSET, STAKE_CONFIG_VAULT_OFFSET + 32)
    ).toBase58();
    const minStakeRaw = data.readBigUInt64LE(STAKE_CONFIG_MIN_STAKE_OFFSET);
    const cooldownSeconds = Number(
      data.readBigUInt64LE(STAKE_CONFIG_COOLDOWN_OFFSET)
    );
    const totalShares = readU128LE(data, STAKE_CONFIG_TOTAL_SHARES_OFFSET);
    const sharePrice = readU128LE(data, STAKE_CONFIG_SHARE_PRICE_OFFSET);

    const sharePriceMultiplier = Number(sharePrice) / Number(SHARE_PRECISION);
    const totalValueRaw = (totalShares * sharePrice) / SHARE_PRECISION;
    const totalValueLocked = Number(totalValueRaw) / SKR_DIVISOR;
    const minStakeAmount = Number(minStakeRaw) / SKR_DIVISOR;

    const guardianCount = guardianAccounts.filter(
      (acc) => (acc.account.data as Buffer).readUInt8(0) === 1
    ).length;

    const result: StakingStats = {
      totalShares,
      sharePrice,
      sharePriceMultiplier,
      totalValueLocked,
      minStakeAmount,
      cooldownSeconds,
      guardianCount,
      vaultAddress,
    };

    statsCache.set("stats", result);
    return result;
  } catch (err) {
    if (err instanceof RpcError) throw err;
    throw new RpcError("Failed to fetch staking stats", err);
  }
}
