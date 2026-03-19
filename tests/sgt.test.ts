import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, PublicKey } from "@solana/web3.js";
import { verifySGT, isSeeker, getSGTDetails } from "../src/sgt";
import {
  SGT_MINT_AUTHORITY,
  SGT_METADATA_ADDRESS,
  SGT_GROUP_MINT_ADDRESS,
  TOKEN_2022_PROGRAM_ID,
} from "../src/constants";
import { InvalidAddressError, RpcError } from "../src/errors";

// Mock @solana/spl-token
vi.mock("@solana/spl-token", () => ({
  unpackMint: vi.fn(),
  getMetadataPointerState: vi.fn(),
  getTokenGroupMemberState: vi.fn(),
}));

import {
  unpackMint,
  getMetadataPointerState,
  getTokenGroupMemberState,
} from "@solana/spl-token";

const VALID_WALLET = "11111111111111111111111111111111";
const MOCK_SGT_MINT = "SGTMint111111111111111111111111111111111111";

function createMockConnection(overrides: Record<string, unknown> = {}) {
  return {
    getParsedTokenAccountsByOwner: vi.fn().mockResolvedValue({ value: [] }),
    getMultipleAccountsInfo: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as Connection;
}

describe("verifySGT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false for wallet with no Token-2022 accounts", async () => {
    const connection = createMockConnection();
    const result = await verifySGT({
      connection,
      walletAddress: VALID_WALLET,
      cache: false,
    });

    expect(result.isSeeker).toBe(false);
    expect(result.mintAddress).toBeNull();
    expect(result.walletAddress).toBe(VALID_WALLET);
  });

  it("returns true for wallet with valid SGT", async () => {
    const mintPubkey = new PublicKey(MOCK_SGT_MINT);
    const mockMint = {
      mintAuthority: SGT_MINT_AUTHORITY,
      address: mintPubkey,
    };

    const connection = createMockConnection({
      getParsedTokenAccountsByOwner: vi.fn().mockResolvedValue({
        value: [
          {
            account: {
              data: {
                parsed: { info: { mint: MOCK_SGT_MINT } },
              },
            },
          },
        ],
      }),
      getMultipleAccountsInfo: vi.fn().mockResolvedValue([
        { data: Buffer.alloc(165), owner: TOKEN_2022_PROGRAM_ID },
      ]),
    });

    vi.mocked(unpackMint).mockReturnValue(mockMint as ReturnType<typeof unpackMint>);
    vi.mocked(getMetadataPointerState).mockReturnValue({
      authority: SGT_MINT_AUTHORITY,
      metadataAddress: SGT_METADATA_ADDRESS,
    });
    vi.mocked(getTokenGroupMemberState).mockReturnValue({
      group: SGT_GROUP_MINT_ADDRESS,
      mint: mintPubkey,
      memberNumber: BigInt(1),
    });

    const result = await verifySGT({
      connection,
      walletAddress: VALID_WALLET,
      cache: false,
    });

    expect(result.isSeeker).toBe(true);
    expect(result.mintAddress).toBe(MOCK_SGT_MINT);
  });

  it("returns false when mint authority does not match", async () => {
    const mintPubkey = new PublicKey(MOCK_SGT_MINT);
    const wrongAuthority = PublicKey.unique();
    const mockMint = {
      mintAuthority: wrongAuthority,
      address: mintPubkey,
    };

    const connection = createMockConnection({
      getParsedTokenAccountsByOwner: vi.fn().mockResolvedValue({
        value: [
          {
            account: {
              data: {
                parsed: { info: { mint: MOCK_SGT_MINT } },
              },
            },
          },
        ],
      }),
      getMultipleAccountsInfo: vi.fn().mockResolvedValue([
        { data: Buffer.alloc(165), owner: TOKEN_2022_PROGRAM_ID },
      ]),
    });

    vi.mocked(unpackMint).mockReturnValue(mockMint as ReturnType<typeof unpackMint>);

    const result = await verifySGT({
      connection,
      walletAddress: VALID_WALLET,
      cache: false,
    });

    expect(result.isSeeker).toBe(false);
  });

  it("returns false when metadata pointer does not match", async () => {
    const mintPubkey = new PublicKey(MOCK_SGT_MINT);
    const mockMint = {
      mintAuthority: SGT_MINT_AUTHORITY,
      address: mintPubkey,
    };

    const connection = createMockConnection({
      getParsedTokenAccountsByOwner: vi.fn().mockResolvedValue({
        value: [
          {
            account: {
              data: {
                parsed: { info: { mint: MOCK_SGT_MINT } },
              },
            },
          },
        ],
      }),
      getMultipleAccountsInfo: vi.fn().mockResolvedValue([
        { data: Buffer.alloc(165), owner: TOKEN_2022_PROGRAM_ID },
      ]),
    });

    vi.mocked(unpackMint).mockReturnValue(mockMint as ReturnType<typeof unpackMint>);
    vi.mocked(getMetadataPointerState).mockReturnValue({
      authority: PublicKey.unique(),
      metadataAddress: SGT_METADATA_ADDRESS,
    });

    const result = await verifySGT({
      connection,
      walletAddress: VALID_WALLET,
      cache: false,
    });

    expect(result.isSeeker).toBe(false);
  });

  it("returns false when token group member does not match", async () => {
    const mintPubkey = new PublicKey(MOCK_SGT_MINT);
    const mockMint = {
      mintAuthority: SGT_MINT_AUTHORITY,
      address: mintPubkey,
    };

    const connection = createMockConnection({
      getParsedTokenAccountsByOwner: vi.fn().mockResolvedValue({
        value: [
          {
            account: {
              data: {
                parsed: { info: { mint: MOCK_SGT_MINT } },
              },
            },
          },
        ],
      }),
      getMultipleAccountsInfo: vi.fn().mockResolvedValue([
        { data: Buffer.alloc(165), owner: TOKEN_2022_PROGRAM_ID },
      ]),
    });

    vi.mocked(unpackMint).mockReturnValue(mockMint as ReturnType<typeof unpackMint>);
    vi.mocked(getMetadataPointerState).mockReturnValue({
      authority: SGT_MINT_AUTHORITY,
      metadataAddress: SGT_METADATA_ADDRESS,
    });
    vi.mocked(getTokenGroupMemberState).mockReturnValue({
      group: PublicKey.unique(),
      mint: mintPubkey,
      memberNumber: BigInt(1),
    });

    const result = await verifySGT({
      connection,
      walletAddress: VALID_WALLET,
      cache: false,
    });

    expect(result.isSeeker).toBe(false);
  });

  it("returns false with mintAddress when SGT is in usedMints (anti-sybil)", async () => {
    const mintPubkey = new PublicKey(MOCK_SGT_MINT);
    const mockMint = {
      mintAuthority: SGT_MINT_AUTHORITY,
      address: mintPubkey,
    };

    const connection = createMockConnection({
      getParsedTokenAccountsByOwner: vi.fn().mockResolvedValue({
        value: [
          {
            account: {
              data: {
                parsed: { info: { mint: MOCK_SGT_MINT } },
              },
            },
          },
        ],
      }),
      getMultipleAccountsInfo: vi.fn().mockResolvedValue([
        { data: Buffer.alloc(165), owner: TOKEN_2022_PROGRAM_ID },
      ]),
    });

    vi.mocked(unpackMint).mockReturnValue(mockMint as ReturnType<typeof unpackMint>);
    vi.mocked(getMetadataPointerState).mockReturnValue({
      authority: SGT_MINT_AUTHORITY,
      metadataAddress: SGT_METADATA_ADDRESS,
    });
    vi.mocked(getTokenGroupMemberState).mockReturnValue({
      group: SGT_GROUP_MINT_ADDRESS,
      mint: mintPubkey,
      memberNumber: BigInt(1),
    });

    const usedMints = new Set([MOCK_SGT_MINT]);
    const result = await verifySGT({
      connection,
      walletAddress: VALID_WALLET,
      usedMints,
      cache: false,
    });

    expect(result.isSeeker).toBe(false);
    expect(result.mintAddress).toBe(MOCK_SGT_MINT);
  });

  it("throws InvalidAddressError for invalid wallet", async () => {
    const connection = createMockConnection();
    await expect(
      verifySGT({
        connection,
        walletAddress: "not-a-valid-address",
        cache: false,
      })
    ).rejects.toThrow(InvalidAddressError);
  });

  it("throws RpcError when RPC call fails", async () => {
    const connection = createMockConnection({
      getParsedTokenAccountsByOwner: vi
        .fn()
        .mockRejectedValue(new Error("RPC timeout")),
    });

    await expect(
      verifySGT({
        connection,
        walletAddress: VALID_WALLET,
        cache: false,
      })
    ).rejects.toThrow(RpcError);
  });
});

describe("isSeeker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns boolean result", async () => {
    const connection = createMockConnection();
    const result = await isSeeker(connection, VALID_WALLET);
    expect(typeof result).toBe("boolean");
    expect(result).toBe(false);
  });
});

describe("getSGTDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full SGTResult", async () => {
    const connection = createMockConnection();
    const result = await getSGTDetails(connection, VALID_WALLET);
    expect(result).toHaveProperty("isSeeker");
    expect(result).toHaveProperty("mintAddress");
    expect(result).toHaveProperty("walletAddress");
  });
});
