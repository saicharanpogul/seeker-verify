import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  resolveSkrDomain,
  reverseResolveSkr,
  isSkrDomain,
  getSkrDomains,
} from "../src/skr-domains";
import { DomainResolutionError, InvalidAddressError } from "../src/errors";

const MOCK_OWNER = PublicKey.unique();

// Mock @onsol/tldparser
vi.mock("@onsol/tldparser", () => ({
  TldParser: vi.fn().mockImplementation(() => ({
    getOwnerFromDomainTld: vi.fn(),
    getMainDomain: vi.fn(),
    getParsedAllUserDomainsFromTld: vi.fn().mockResolvedValue([]),
  })),
}));

import { TldParser } from "@onsol/tldparser";

function createMockConnection() {
  return {} as unknown as Connection;
}

describe("resolveSkrDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves a valid .skr domain to owner address", async () => {
    const mockParser = {
      getOwnerFromDomainTld: vi.fn().mockResolvedValue(MOCK_OWNER),
      getMainDomain: vi.fn(),
      getParsedAllUserDomainsFromTld: vi.fn(),
    };
    vi.mocked(TldParser).mockImplementation(() => mockParser as unknown as InstanceType<typeof TldParser>);

    const connection = createMockConnection();
    const result = await resolveSkrDomain(connection, "testuser1.skr");

    expect(result).toBe(MOCK_OWNER.toBase58());
    expect(mockParser.getOwnerFromDomainTld).toHaveBeenCalledWith("testuser1.skr");
  });

  it("adds .skr suffix when not provided", async () => {
    const mockParser = {
      getOwnerFromDomainTld: vi.fn().mockResolvedValue(MOCK_OWNER),
      getMainDomain: vi.fn(),
      getParsedAllUserDomainsFromTld: vi.fn(),
    };
    vi.mocked(TldParser).mockImplementation(() => mockParser as unknown as InstanceType<typeof TldParser>);

    const connection = createMockConnection();
    // Use a unique domain name to avoid cache from previous test
    await resolveSkrDomain(connection, "testuser2");

    expect(mockParser.getOwnerFromDomainTld).toHaveBeenCalledWith("testuser2.skr");
  });

  it("returns null for non-existent domain", async () => {
    const mockParser = {
      getOwnerFromDomainTld: vi.fn().mockResolvedValue(undefined),
      getMainDomain: vi.fn(),
      getParsedAllUserDomainsFromTld: vi.fn(),
    };
    vi.mocked(TldParser).mockImplementation(() => mockParser as unknown as InstanceType<typeof TldParser>);

    const connection = createMockConnection();
    const result = await resolveSkrDomain(connection, "nonexistent.skr");

    expect(result).toBeNull();
  });

  it("throws DomainResolutionError for empty domain", async () => {
    const connection = createMockConnection();
    await expect(resolveSkrDomain(connection, "")).rejects.toThrow(
      DomainResolutionError
    );
  });

  it("throws DomainResolutionError for just .skr", async () => {
    const connection = createMockConnection();
    await expect(resolveSkrDomain(connection, ".skr")).rejects.toThrow(
      DomainResolutionError
    );
  });
});

describe("reverseResolveSkr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns domain from main domain lookup", async () => {
    const wallet = PublicKey.unique();
    const mockParser = {
      getOwnerFromDomainTld: vi.fn(),
      getMainDomain: vi.fn().mockResolvedValue({
        domain: "saicharan",
        tld: "skr",
        nameAccount: MOCK_OWNER,
      }),
      getParsedAllUserDomainsFromTld: vi.fn(),
    };
    vi.mocked(TldParser).mockImplementation(() => mockParser as unknown as InstanceType<typeof TldParser>);

    const connection = createMockConnection();
    const result = await reverseResolveSkr(connection, wallet);

    expect(result).toBe("saicharan.skr");
  });

  it("falls back to domain list when no main domain", async () => {
    const wallet = PublicKey.unique();
    const mockParser = {
      getOwnerFromDomainTld: vi.fn(),
      getMainDomain: vi.fn().mockRejectedValue(new Error("not found")),
      getParsedAllUserDomainsFromTld: vi.fn().mockResolvedValue([
        { domain: "fallback", nameAccount: MOCK_OWNER },
      ]),
    };
    vi.mocked(TldParser).mockImplementation(() => mockParser as unknown as InstanceType<typeof TldParser>);

    const connection = createMockConnection();
    const result = await reverseResolveSkr(connection, wallet);

    expect(result).toBe("fallback.skr");
  });

  it("returns null when no .skr domains found", async () => {
    const wallet = PublicKey.unique();
    const mockParser = {
      getOwnerFromDomainTld: vi.fn(),
      getMainDomain: vi.fn().mockRejectedValue(new Error("not found")),
      getParsedAllUserDomainsFromTld: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(TldParser).mockImplementation(() => mockParser as unknown as InstanceType<typeof TldParser>);

    const connection = createMockConnection();
    const result = await reverseResolveSkr(connection, wallet);

    expect(result).toBeNull();
  });

  it("throws InvalidAddressError for invalid wallet", async () => {
    const connection = createMockConnection();
    await expect(
      reverseResolveSkr(connection, "invalid")
    ).rejects.toThrow(InvalidAddressError);
  });
});

describe("isSkrDomain", () => {
  it("returns true for valid domain with .skr", () => {
    expect(isSkrDomain("saicharan.skr")).toBe(true);
  });

  it("returns true for valid domain without .skr", () => {
    expect(isSkrDomain("saicharan")).toBe(true);
  });

  it("returns true for domain with hyphens", () => {
    expect(isSkrDomain("my-name.skr")).toBe(true);
  });

  it("returns true for domain with numbers", () => {
    expect(isSkrDomain("user123")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isSkrDomain("")).toBe(false);
  });

  it("returns false for domain starting with hyphen", () => {
    expect(isSkrDomain("-invalid.skr")).toBe(false);
  });

  it("returns false for domain with special chars", () => {
    expect(isSkrDomain("user@name.skr")).toBe(false);
  });
});

describe("getSkrDomains", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns array of domains owned by wallet", async () => {
    const wallet = PublicKey.unique();
    const mockParser = {
      getOwnerFromDomainTld: vi.fn(),
      getMainDomain: vi.fn(),
      getParsedAllUserDomainsFromTld: vi.fn().mockResolvedValue([
        { domain: "first", nameAccount: MOCK_OWNER },
        { domain: "second", nameAccount: MOCK_OWNER },
      ]),
    };
    vi.mocked(TldParser).mockImplementation(() => mockParser as unknown as InstanceType<typeof TldParser>);

    const connection = createMockConnection();
    const result = await getSkrDomains(connection, wallet);

    expect(result).toEqual(["first.skr", "second.skr"]);
  });

  it("returns empty array when wallet has no domains", async () => {
    const wallet = PublicKey.unique();
    const mockParser = {
      getOwnerFromDomainTld: vi.fn(),
      getMainDomain: vi.fn(),
      getParsedAllUserDomainsFromTld: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(TldParser).mockImplementation(() => mockParser as unknown as InstanceType<typeof TldParser>);

    const connection = createMockConnection();
    const result = await getSkrDomains(connection, wallet);

    expect(result).toEqual([]);
  });
});
