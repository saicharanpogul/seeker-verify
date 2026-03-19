import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, PublicKey } from "@solana/web3.js";
import { getSKRBalance, getSKRStakeInfo, hasMinSKR } from "../src/skr-token";
import { InvalidAddressError, RpcError } from "../src/errors";

// Mock @solana/spl-token
vi.mock("@solana/spl-token", () => ({
  getAccount: vi.fn(),
  getAssociatedTokenAddressSync: vi.fn().mockReturnValue(
    new PublicKey("11111111111111111111111111111111")
  ),
}));

import { getAccount } from "@solana/spl-token";

const VALID_WALLET = "11111111111111111111111111111111";

function createMockConnection() {
  return {} as unknown as Connection;
}

describe("getSKRBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns balance for wallet with SKR tokens", async () => {
    vi.mocked(getAccount).mockResolvedValue({
      amount: BigInt(5_000_000), // 5.0 SKR (6 decimals)
      address: new PublicKey(VALID_WALLET),
      mint: new PublicKey(VALID_WALLET),
      owner: new PublicKey(VALID_WALLET),
      isInitialized: true,
      isFrozen: false,
      isNative: false,
      delegateOption: 0,
      delegate: null,
      delegatedAmount: BigInt(0),
      closeAuthorityOption: 0,
      closeAuthority: null,
      rentExemptReserve: null,
      tlvData: Buffer.alloc(0),
    } as unknown as Awaited<ReturnType<typeof getAccount>>);

    const connection = createMockConnection();
    const result = await getSKRBalance(connection, VALID_WALLET, {
      cache: false,
    });

    expect(result.balance).toBe(5_000_000);
    expect(result.uiBalance).toBe(5.0);
    expect(result.walletAddress).toBe(VALID_WALLET);
  });

  it("returns zero balance when no token account exists", async () => {
    const err = new Error("Account not found");
    (err as { name: string }).name = "TokenAccountNotFoundError";
    vi.mocked(getAccount).mockRejectedValue(err);

    const connection = createMockConnection();
    const result = await getSKRBalance(connection, VALID_WALLET, {
      cache: false,
    });

    expect(result.balance).toBe(0);
    expect(result.uiBalance).toBe(0);
  });

  it("throws InvalidAddressError for invalid wallet", async () => {
    const connection = createMockConnection();
    await expect(
      getSKRBalance(connection, "invalid-address", { cache: false })
    ).rejects.toThrow(InvalidAddressError);
  });

  it("throws RpcError for unexpected errors", async () => {
    vi.mocked(getAccount).mockRejectedValue(new Error("Connection failed"));

    const connection = createMockConnection();
    await expect(
      getSKRBalance(connection, VALID_WALLET, { cache: false })
    ).rejects.toThrow(RpcError);
  });
});

describe("getSKRStakeInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeUserStakeData(shares: bigint, costBasis: bigint, unstaking: bigint): Buffer {
    // 169 bytes: disc(8) + bump(1) + stake_config(32) + user(32) + guardian_pool(32)
    //   + shares(u128@105) + cost_basis(u128@121) + commission(u128@137) + unstaking(u64@153) + timestamp(i64@161)
    const data = Buffer.alloc(169);
    // discriminator
    Buffer.from("6635a36b098a5799", "hex").copy(data, 0);
    // shares u128 LE (just low 8 bytes for test values)
    data.writeBigUInt64LE(shares, 105);
    data.writeBigUInt64LE(0n, 113);
    // cost_basis u128 LE
    data.writeBigUInt64LE(costBasis, 121);
    data.writeBigUInt64LE(0n, 129);
    // unstaking_amount u64
    data.writeBigUInt64LE(unstaking, 153);
    return data;
  }

  function makeStakeConfigData(sharePrice: bigint): Buffer {
    // 193 bytes, share_price u128 at offset 137
    const data = Buffer.alloc(193);
    data.writeBigUInt64LE(sharePrice, 137);
    data.writeBigUInt64LE(0n, 145);
    return data;
  }

  it("returns staking info with yield from UserStake accounts", async () => {
    const wallet = PublicKey.unique();
    // 10,000 SKR deposited at cost_basis 1e9, current share price 1.05e9
    const userStakeData = makeUserStakeData(
      BigInt(10_000_000_000), // shares
      BigInt(1_000_000_000),  // cost_basis (1e9 = 1.0 share price at entry)
      0n                      // no unstaking
    );
    const stakeConfigData = makeStakeConfigData(BigInt(1_050_000_000)); // 1.05x

    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([
        { pubkey: PublicKey.unique(), account: { data: userStakeData } },
      ]),
      getAccountInfo: vi.fn().mockResolvedValue({ data: stakeConfigData }),
    } as unknown as Connection;

    const result = await getSKRStakeInfo(connection, wallet);

    expect(result.isStaked).toBe(true);
    expect(result.depositedAmount).toBe(10000);
    expect(result.currentAmount).toBe(10500);
    expect(result.yieldEarned).toBe(500);
    expect(result.unstakingAmount).toBe(0);
  });

  it("sums multiple UserStake accounts across guardians", async () => {
    const wallet = PublicKey.unique();
    const stake1 = makeUserStakeData(BigInt(5_000_000_000), BigInt(1_000_000_000), 0n);
    const stake2 = makeUserStakeData(BigInt(3_000_000_000), BigInt(1_000_000_000), 0n);
    const configData = makeStakeConfigData(BigInt(1_100_000_000)); // 1.1x

    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([
        { pubkey: PublicKey.unique(), account: { data: stake1 } },
        { pubkey: PublicKey.unique(), account: { data: stake2 } },
      ]),
      getAccountInfo: vi.fn().mockResolvedValue({ data: configData }),
    } as unknown as Connection;

    const result = await getSKRStakeInfo(connection, wallet);

    expect(result.isStaked).toBe(true);
    expect(result.depositedAmount).toBe(8000);
    expect(result.currentAmount).toBe(8800);
    expect(result.yieldEarned).toBe(800);
  });

  it("returns not staked when no UserStake accounts found", async () => {
    const wallet = PublicKey.unique();
    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([]),
    } as unknown as Connection;

    const result = await getSKRStakeInfo(connection, wallet);

    expect(result.isStaked).toBe(false);
    expect(result.depositedAmount).toBe(0);
    expect(result.currentAmount).toBe(0);
    expect(result.yieldEarned).toBe(0);
  });

  it("includes unstaking amount", async () => {
    const wallet = PublicKey.unique();
    const stakeData = makeUserStakeData(
      BigInt(5_000_000_000),
      BigInt(1_000_000_000),
      BigInt(2_000_000_000) // 2000 SKR unstaking
    );
    const configData = makeStakeConfigData(BigInt(1_000_000_000));

    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([
        { pubkey: PublicKey.unique(), account: { data: stakeData } },
      ]),
      getAccountInfo: vi.fn().mockResolvedValue({ data: configData }),
    } as unknown as Connection;

    const result = await getSKRStakeInfo(connection, wallet);

    expect(result.unstakingAmount).toBe(2000);
  });

  it("throws InvalidAddressError for invalid wallet", async () => {
    const connection = {
      getProgramAccounts: vi.fn(),
    } as unknown as Connection;
    await expect(
      getSKRStakeInfo(connection, "invalid")
    ).rejects.toThrow(InvalidAddressError);
  });

  it("throws RpcError when getProgramAccounts fails", async () => {
    const wallet = PublicKey.unique();
    const connection = {
      getProgramAccounts: vi.fn().mockRejectedValue(new Error("RPC failed")),
    } as unknown as Connection;

    await expect(
      getSKRStakeInfo(connection, wallet)
    ).rejects.toThrow(RpcError);
  });
});

describe("hasMinSKR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when balance meets minimum", async () => {
    vi.mocked(getAccount).mockResolvedValue({
      amount: BigInt(100_000_000), // 100 SKR
      address: new PublicKey(VALID_WALLET),
      mint: new PublicKey(VALID_WALLET),
      owner: new PublicKey(VALID_WALLET),
      isInitialized: true,
      isFrozen: false,
      isNative: false,
      delegateOption: 0,
      delegate: null,
      delegatedAmount: BigInt(0),
      closeAuthorityOption: 0,
      closeAuthority: null,
      rentExemptReserve: null,
      tlvData: Buffer.alloc(0),
    } as unknown as Awaited<ReturnType<typeof getAccount>>);

    const connection = createMockConnection();
    const result = await hasMinSKR(connection, VALID_WALLET, 50);

    expect(result).toBe(true);
  });

  it("returns false when balance below minimum", async () => {
    const uniqueWallet = PublicKey.unique();
    vi.mocked(getAccount).mockResolvedValue({
      amount: BigInt(10_000_000), // 10 SKR
      address: uniqueWallet,
      mint: uniqueWallet,
      owner: uniqueWallet,
      isInitialized: true,
      isFrozen: false,
      isNative: false,
      delegateOption: 0,
      delegate: null,
      delegatedAmount: BigInt(0),
      closeAuthorityOption: 0,
      closeAuthority: null,
      rentExemptReserve: null,
      tlvData: Buffer.alloc(0),
    } as unknown as Awaited<ReturnType<typeof getAccount>>);

    const connection = createMockConnection();
    const result = await hasMinSKR(connection, uniqueWallet, 50);

    expect(result).toBe(false);
  });
});
