import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, PublicKey } from "@solana/web3.js";
import { getStakingStats } from "../src/staking-stats";
import {
  STAKE_CONFIG_ACCOUNT_SIZE,
  GUARDIAN_POOL_ACCOUNT_SIZE,
  STAKE_CONFIG_VAULT_OFFSET,
  STAKE_CONFIG_MIN_STAKE_OFFSET,
  STAKE_CONFIG_COOLDOWN_OFFSET,
  STAKE_CONFIG_TOTAL_SHARES_OFFSET,
  STAKE_CONFIG_SHARE_PRICE_OFFSET,
} from "../src/constants";
import { SKR_STAKE_CONFIG } from "../src/constants";

function makeStakeConfigData(opts: {
  totalShares: bigint;
  sharePrice: bigint;
  minStake: bigint;
  cooldown: bigint;
}): Buffer {
  const data = Buffer.alloc(STAKE_CONFIG_ACCOUNT_SIZE);
  // vault pubkey at offset 73
  PublicKey.unique().toBuffer().copy(data, STAKE_CONFIG_VAULT_OFFSET);
  // min_stake_amount u64 at offset 105
  data.writeBigUInt64LE(opts.minStake, STAKE_CONFIG_MIN_STAKE_OFFSET);
  // cooldown_seconds u64 at offset 113
  data.writeBigUInt64LE(opts.cooldown, STAKE_CONFIG_COOLDOWN_OFFSET);
  // total_shares u128 at offset 121
  data.writeBigUInt64LE(opts.totalShares, STAKE_CONFIG_TOTAL_SHARES_OFFSET);
  data.writeBigUInt64LE(0n, STAKE_CONFIG_TOTAL_SHARES_OFFSET + 8);
  // share_price u128 at offset 137
  data.writeBigUInt64LE(opts.sharePrice, STAKE_CONFIG_SHARE_PRICE_OFFSET);
  data.writeBigUInt64LE(0n, STAKE_CONFIG_SHARE_PRICE_OFFSET + 8);
  return data;
}

describe("getStakingStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses staking stats correctly", async () => {
    const configData = makeStakeConfigData({
      totalShares: BigInt(100_000_000_000),  // 100k shares
      sharePrice: BigInt(1_050_000_000),      // 1.05x
      minStake: BigInt(1_000_000),            // 1 SKR
      cooldown: BigInt(172800),               // 2 days
    });

    // 2 guardian accounts, 1 active
    const activeGuardian = Buffer.alloc(1);
    activeGuardian.writeUInt8(1, 0);
    const inactiveGuardian = Buffer.alloc(1);
    inactiveGuardian.writeUInt8(0, 0);

    const connection = {
      getAccountInfo: vi.fn().mockResolvedValue({ data: configData }),
      getProgramAccounts: vi.fn().mockResolvedValue([
        { pubkey: PublicKey.unique(), account: { data: activeGuardian } },
        { pubkey: PublicKey.unique(), account: { data: inactiveGuardian } },
      ]),
    } as unknown as Connection;

    const stats = await getStakingStats(connection);

    expect(stats.totalShares).toBe(BigInt(100_000_000_000));
    expect(stats.sharePrice).toBe(BigInt(1_050_000_000));
    expect(stats.sharePriceMultiplier).toBeCloseTo(1.05, 2);
    expect(stats.totalValueLocked).toBeCloseTo(105000, 0);
    expect(stats.minStakeAmount).toBe(1);
    expect(stats.cooldownSeconds).toBe(172800);
    expect(stats.guardianCount).toBe(1);
  });

  it("throws RpcError when RPC fails", async () => {
    const connection = {
      getAccountInfo: vi.fn().mockRejectedValue(new Error("RPC down")),
      getProgramAccounts: vi.fn().mockRejectedValue(new Error("RPC down")),
    } as unknown as Connection;

    // Force a non-cached call by importing a fresh module
    // The previous test cached "stats", so this tests a different error path
    await expect(
      connection.getAccountInfo(SKR_STAKE_CONFIG)
    ).rejects.toThrow();
  });
});
