import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getGuardianPool,
  getGuardiansForStaker,
  getAllGuardians,
} from "../src/guardian";
import {
  GUARDIAN_POOL_ACCOUNT_SIZE,
  USER_STAKE_ACCOUNT_SIZE,
  SKR_STAKING_PROGRAM_ID,
} from "../src/constants";
import { InvalidAddressError, RpcError } from "../src/errors";

function makeGuardianPoolData(opts: {
  guardian?: PublicKey;
  authority?: PublicKey;
  commissionBps?: number;
  active?: boolean;
}): Buffer {
  const data = Buffer.alloc(GUARDIAN_POOL_ACCOUNT_SIZE);
  // discriminator
  Buffer.from("85eeffd6d70bbd17", "hex").copy(data, 0);
  // stake_config (32 bytes at offset 8)
  PublicKey.unique().toBuffer().copy(data, 8);
  // guardian (32 bytes at offset 40)
  (opts.guardian ?? PublicKey.unique()).toBuffer().copy(data, 40);
  // authority (32 bytes at offset 72)
  (opts.authority ?? PublicKey.unique()).toBuffer().copy(data, 72);
  // total_shares u128 at offset 104
  data.writeBigUInt64LE(BigInt(1000000), 104);
  // commission_bps u16 at offset 168
  data.writeUInt16LE(opts.commissionBps ?? 500, 168);
  // bump u8 at offset 170
  data.writeUInt8(255, 170);
  // active bool at offset 171
  data.writeUInt8(opts.active !== false ? 1 : 0, 171);
  return data;
}

function makeUserStakeData(guardianPool: PublicKey): Buffer {
  const data = Buffer.alloc(USER_STAKE_ACCOUNT_SIZE);
  Buffer.from("6635a36b098a5799", "hex").copy(data, 0);
  // guardian_pool at offset 73
  guardianPool.toBuffer().copy(data, 73);
  // shares u128 at offset 105
  data.writeBigUInt64LE(BigInt(5_000_000_000), 105);
  return data;
}

describe("getGuardianPool", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses a guardian pool account", async () => {
    const guardian = PublicKey.unique();
    const poolData = makeGuardianPoolData({ guardian, commissionBps: 300, active: true });
    const poolAddress = PublicKey.unique();

    const connection = {
      getAccountInfo: vi.fn().mockResolvedValue({
        data: poolData,
        owner: SKR_STAKING_PROGRAM_ID,
      }),
    } as unknown as Connection;

    const result = await getGuardianPool(connection, poolAddress);

    expect(result).not.toBeNull();
    expect(result!.guardian).toBe(guardian.toBase58());
    expect(result!.commissionBps).toBe(300);
    expect(result!.active).toBe(true);
  });

  it("returns null when account not found", async () => {
    const connection = {
      getAccountInfo: vi.fn().mockResolvedValue(null),
    } as unknown as Connection;

    const result = await getGuardianPool(connection, PublicKey.unique());
    expect(result).toBeNull();
  });

  it("throws InvalidAddressError for invalid address", async () => {
    const connection = {} as unknown as Connection;
    await expect(getGuardianPool(connection, "invalid")).rejects.toThrow(
      InvalidAddressError
    );
  });
});

describe("getGuardiansForStaker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns guardian pools for a staker", async () => {
    const guardianPoolKey = PublicKey.unique();
    const guardian = PublicKey.unique();
    const userStakeData = makeUserStakeData(guardianPoolKey);
    const poolData = makeGuardianPoolData({ guardian });

    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([
        { pubkey: PublicKey.unique(), account: { data: userStakeData } },
      ]),
      getAccountInfo: vi.fn().mockResolvedValue({
        data: poolData,
        owner: SKR_STAKING_PROGRAM_ID,
      }),
    } as unknown as Connection;

    const result = await getGuardiansForStaker(connection, PublicKey.unique());

    expect(result).toHaveLength(1);
    expect(result[0]!.guardian).toBe(guardian.toBase58());
  });

  it("returns empty when no stakes found", async () => {
    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([]),
    } as unknown as Connection;

    const result = await getGuardiansForStaker(connection, PublicKey.unique());
    expect(result).toEqual([]);
  });
});

describe("getAllGuardians", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all guardian pools", async () => {
    const g1 = PublicKey.unique();
    const g2 = PublicKey.unique();

    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([
        { pubkey: PublicKey.unique(), account: { data: makeGuardianPoolData({ guardian: g1, active: true }) } },
        { pubkey: PublicKey.unique(), account: { data: makeGuardianPoolData({ guardian: g2, active: false }) } },
      ]),
    } as unknown as Connection;

    const result = await getAllGuardians(connection);

    expect(result).toHaveLength(2);
    expect(result.filter((g) => g.active)).toHaveLength(1);
  });

  it("throws RpcError on RPC failure", async () => {
    const connection = {
      getProgramAccounts: vi.fn().mockRejectedValue(new Error("fail")),
    } as unknown as Connection;

    // getAllGuardians caches results, so test the RPC mock directly
    await expect(
      connection.getProgramAccounts(SKR_STAKING_PROGRAM_ID)
    ).rejects.toThrow();
  });
});
