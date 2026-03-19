import { Connection, PublicKey } from "@solana/web3.js";
import {
  SKR_STAKING_PROGRAM_ID,
  GUARDIAN_POOL_ACCOUNT_SIZE,
  GUARDIAN_POOL_GUARDIAN_OFFSET,
  GUARDIAN_POOL_AUTHORITY_OFFSET,
  GUARDIAN_POOL_TOTAL_SHARES_OFFSET,
  GUARDIAN_POOL_COMMISSION_BPS_OFFSET,
  GUARDIAN_POOL_ACTIVE_OFFSET,
  USER_STAKE_ACCOUNT_SIZE,
  USER_STAKE_USER_OFFSET,
  USER_STAKE_GUARDIAN_POOL_OFFSET,
  GUARDIAN_CACHE_TTL,
} from "./constants";
import { GuardianPool, WalletAddress } from "./types";
import { RpcError } from "./errors";
import { validateAndParseAddress, readU128LE } from "./utils";
import { LRUCache } from "./cache";

const guardianCache = new LRUCache<GuardianPool>({
  maxSize: 200,
  ttlSeconds: GUARDIAN_CACHE_TTL,
});

const allGuardiansCache = new LRUCache<GuardianPool[]>({
  maxSize: 1,
  ttlSeconds: GUARDIAN_CACHE_TTL,
});

function parseGuardianPool(address: PublicKey, data: Buffer): GuardianPool {
  return {
    address: address.toBase58(),
    guardian: new PublicKey(
      data.slice(GUARDIAN_POOL_GUARDIAN_OFFSET, GUARDIAN_POOL_GUARDIAN_OFFSET + 32)
    ).toBase58(),
    authority: new PublicKey(
      data.slice(GUARDIAN_POOL_AUTHORITY_OFFSET, GUARDIAN_POOL_AUTHORITY_OFFSET + 32)
    ).toBase58(),
    totalShares: readU128LE(data, GUARDIAN_POOL_TOTAL_SHARES_OFFSET),
    commissionBps: data.readUInt16LE(GUARDIAN_POOL_COMMISSION_BPS_OFFSET),
    active: data.readUInt8(GUARDIAN_POOL_ACTIVE_OFFSET) === 1,
    accruedCommission: readU128LE(data, 152),
  };
}

/**
 * Get a guardian delegation pool by its account address.
 *
 * @param connection - Solana RPC connection
 * @param guardianPoolAddress - The guardian pool account address
 * @returns Guardian pool info or null if not found
 * @throws {InvalidAddressError} If the address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const pool = await getGuardianPool(connection, guardianPoolAddress);
 * if (pool) {
 *   console.log(`Commission: ${pool.commissionBps / 100}%`);
 * }
 * ```
 */
export async function getGuardianPool(
  connection: Connection,
  guardianPoolAddress: WalletAddress
): Promise<GuardianPool | null> {
  const pubkey = validateAndParseAddress(guardianPoolAddress);
  const key = pubkey.toBase58();

  const cached = guardianCache.get(key);
  if (cached) return cached;

  try {
    const info = await connection.getAccountInfo(pubkey);
    if (!info || info.data.length !== GUARDIAN_POOL_ACCOUNT_SIZE) return null;
    if (!info.owner.equals(SKR_STAKING_PROGRAM_ID)) return null;

    const pool = parseGuardianPool(pubkey, info.data as Buffer);
    guardianCache.set(key, pool);
    return pool;
  } catch (err) {
    throw new RpcError("Failed to fetch guardian pool", err);
  }
}

/**
 * Get the guardian pool(s) a wallet has staked to.
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to look up
 * @returns Array of guardian pool addresses the wallet has staked to
 * @throws {InvalidAddressError} If the address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const guardians = await getGuardiansForStaker(connection, walletAddress);
 * for (const pool of guardians) {
 *   console.log(`Staked to guardian: ${pool.guardian}`);
 * }
 * ```
 */
export async function getGuardiansForStaker(
  connection: Connection,
  walletAddress: WalletAddress
): Promise<GuardianPool[]> {
  const pubkey = validateAndParseAddress(walletAddress);

  try {
    const userStakes = await connection.getProgramAccounts(
      SKR_STAKING_PROGRAM_ID,
      {
        filters: [
          { dataSize: USER_STAKE_ACCOUNT_SIZE },
          { memcmp: { offset: USER_STAKE_USER_OFFSET, bytes: pubkey.toBase58() } },
        ],
      }
    );

    if (userStakes.length === 0) return [];

    const guardianPools: GuardianPool[] = [];

    for (const account of userStakes) {
      const data = account.account.data as Buffer;
      const guardianPoolKey = new PublicKey(
        data.slice(
          USER_STAKE_GUARDIAN_POOL_OFFSET,
          USER_STAKE_GUARDIAN_POOL_OFFSET + 32
        )
      );

      const pool = await getGuardianPool(connection, guardianPoolKey);
      if (pool) guardianPools.push(pool);
    }

    return guardianPools;
  } catch (err) {
    if (err instanceof RpcError) throw err;
    throw new RpcError("Failed to fetch guardians for staker", err);
  }
}

/**
 * Get all registered guardian pools.
 *
 * Note: This fetches all GuardianDelegationPool accounts from the staking
 * program. May be slow on rate-limited RPCs.
 *
 * @param connection - Solana RPC connection
 * @returns Array of all guardian pools
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const guardians = await getAllGuardians(connection);
 * const active = guardians.filter(g => g.active);
 * console.log(`${active.length} active guardians`);
 * ```
 */
export async function getAllGuardians(
  connection: Connection
): Promise<GuardianPool[]> {
  const cached = allGuardiansCache.get("all");
  if (cached) return cached;

  try {
    const accounts = await connection.getProgramAccounts(
      SKR_STAKING_PROGRAM_ID,
      {
        filters: [{ dataSize: GUARDIAN_POOL_ACCOUNT_SIZE }],
      }
    );

    const pools = accounts.map((acc) =>
      parseGuardianPool(acc.pubkey, acc.account.data as Buffer)
    );

    allGuardiansCache.set("all", pools);
    return pools;
  } catch (err) {
    throw new RpcError("Failed to fetch guardian pools", err);
  }
}
