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

  it("returns staked amount from claim accounts", async () => {
    const wallet = PublicKey.unique();
    // Mock claim account data: 8-byte disc + 32-byte wallet + 8 locked + 8 unlocked + 8 total
    const data = Buffer.alloc(64);
    data.writeBigUInt64LE(BigInt(5_000_000), 56); // 5 SKR staked

    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([
        {
          pubkey: PublicKey.unique(),
          account: { data },
        },
      ]),
    } as unknown as Connection;

    const result = await getSKRStakeInfo(connection, wallet);

    expect(result.isStaked).toBe(true);
    expect(result.stakedAmount).toBe(5_000_000);
    expect(result.stakedUiAmount).toBe(5.0);
  });

  it("sums multiple claim accounts", async () => {
    const wallet = PublicKey.unique();
    const data1 = Buffer.alloc(64);
    data1.writeBigUInt64LE(BigInt(10_000_000_000), 56); // 10000 SKR
    const data2 = Buffer.alloc(64);
    data2.writeBigUInt64LE(BigInt(5_000_000_000), 56); // 5000 SKR

    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([
        { pubkey: PublicKey.unique(), account: { data: data1 } },
        { pubkey: PublicKey.unique(), account: { data: data2 } },
      ]),
    } as unknown as Connection;

    const result = await getSKRStakeInfo(connection, wallet);

    expect(result.isStaked).toBe(true);
    expect(result.stakedUiAmount).toBe(15000);
  });

  it("returns not staked when no claim accounts found", async () => {
    const wallet = PublicKey.unique();
    const connection = {
      getProgramAccounts: vi.fn().mockResolvedValue([]),
    } as unknown as Connection;

    const result = await getSKRStakeInfo(connection, wallet);

    expect(result.isStaked).toBe(false);
    expect(result.stakedAmount).toBe(0);
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
