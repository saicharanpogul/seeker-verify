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
  it("returns not staked (staking program lacks per-user queryable accounts)", async () => {
    const connection = createMockConnection();
    const result = await getSKRStakeInfo(connection, VALID_WALLET);

    expect(result.isStaked).toBe(false);
    expect(result.stakedAmount).toBe(0);
    expect(result.stakedUiAmount).toBe(0);
    expect(result.walletAddress).toBe(VALID_WALLET);
  });

  it("throws InvalidAddressError for invalid wallet", async () => {
    const connection = createMockConnection();
    await expect(
      getSKRStakeInfo(connection, "invalid")
    ).rejects.toThrow(InvalidAddressError);
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
