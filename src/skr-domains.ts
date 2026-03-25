import { Connection } from "@solana/web3.js";
import { TldParser } from "@onsol/tldparser";
import { SKR_TLD, DOMAIN_CACHE_TTL } from "./constants";
import { WalletAddress } from "./types";
import { DomainResolutionError } from "./errors";
import { validateAndParseAddress } from "./utils";
import { LRUCache } from "./cache";

const forwardCache = new LRUCache<string | null>({
  maxSize: 500,
  ttlSeconds: DOMAIN_CACHE_TTL,
});

const reverseCache = new LRUCache<string | null>({
  maxSize: 500,
  ttlSeconds: DOMAIN_CACHE_TTL,
});

/**
 * Normalize a .skr domain input by ensuring it includes the .skr suffix.
 */
function normalizeDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (trimmed.endsWith(SKR_TLD)) return trimmed;
  return `${trimmed}${SKR_TLD}`;
}

/**
 * Strip the .skr suffix from a domain name.
 */
function stripTld(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (trimmed.endsWith(SKR_TLD)) {
    return trimmed.slice(0, -SKR_TLD.length);
  }
  return trimmed;
}

/**
 * Resolve a .skr domain name to its owner's wallet address.
 *
 * Uses the AllDomains protocol (@onsol/tldparser) for resolution.
 *
 * @param connection - Solana RPC connection
 * @param domain - Domain name (e.g. "saicharan.skr" or "saicharan")
 * @returns Owner wallet address as a base58 string, or null if not found
 * @throws {DomainResolutionError} If the domain format is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const owner = await resolveSkrDomain(connection, "saicharan.skr");
 * if (owner) {
 *   console.log("Owner:", owner);
 * }
 * ```
 */
export async function resolveSkrDomain(
  connection: Connection,
  domain: string
): Promise<string | null> {
  const normalized = normalizeDomain(domain);
  const name = stripTld(normalized);

  if (!name || name.length === 0) {
    throw new DomainResolutionError("Domain name cannot be empty");
  }

  // Check cache
  const cached = forwardCache.get(normalized);
  if (cached !== undefined) return cached;

  try {
    const parser = new TldParser(connection);
    const owner = await parser.getOwnerFromDomainTld(normalized);

    if (!owner) {
      forwardCache.set(normalized, null);
      return null;
    }

    const ownerStr = owner.toBase58();
    forwardCache.set(normalized, ownerStr);
    return ownerStr;
  } catch (err) {
    if (err instanceof DomainResolutionError) throw err;
    // Domain not found returns undefined from the parser, errors mean RPC issues
    forwardCache.set(normalized, null);
    return null;
  }
}

/**
 * Reverse resolve a wallet address to its primary .skr domain.
 *
 * Returns the main/primary .skr domain set by the user, if any.
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to look up
 * @returns The .skr domain (e.g. "saicharan.skr") or null if none found
 * @throws {InvalidAddressError} If the wallet address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const domain = await reverseResolveSkr(connection, walletAddress);
 * if (domain) {
 *   console.log("Domain:", domain); // "saicharan.skr"
 * }
 * ```
 */
export async function reverseResolveSkr(
  connection: Connection,
  walletAddress: WalletAddress
): Promise<string | null> {
  const pubkey = validateAndParseAddress(walletAddress);
  const walletStr = pubkey.toBase58();

  // Check cache
  const cached = reverseCache.get(walletStr);
  if (cached !== undefined) return cached;

  try {
    const parser = new TldParser(connection);

    // Try to get the main domain first
    try {
      const mainDomain = await parser.getMainDomain(pubkey);
      if (mainDomain && mainDomain.tld === "skr") {
        const domain = `${mainDomain.domain}${SKR_TLD}`;
        reverseCache.set(walletStr, domain);
        return domain;
      }
    } catch {
      // No main domain set, fall through to search all domains
    }

    // Fallback: get all .skr domains and return the first one
    const domains = await parser.getParsedAllUserDomainsFromTld(pubkey, SKR_TLD.slice(1));
    if (domains.length > 0 && domains[0]) {
      const domain = domains[0].domain.endsWith(SKR_TLD) ? domains[0].domain : `${domains[0].domain}${SKR_TLD}`;
      reverseCache.set(walletStr, domain);
      return domain;
    }

    reverseCache.set(walletStr, null);
    return null;
  } catch (err) {
    if (err instanceof DomainResolutionError) throw err;
    reverseCache.set(walletStr, null);
    return null;
  }
}

/**
 * Check if a string is a valid .skr domain format.
 *
 * Validates that the input matches expected domain naming rules:
 * alphanumeric characters and hyphens, with .skr suffix optional.
 *
 * @param input - String to check
 * @returns Whether the input is a valid .skr domain format
 *
 * @example
 * ```typescript
 * isSkrDomain("saicharan.skr"); // true
 * isSkrDomain("saicharan");     // true
 * isSkrDomain("");              // false
 * ```
 */
export function isSkrDomain(input: string): boolean {
  const name = stripTld(input.trim());
  if (!name || name.length === 0) return false;
  // AllDomains allows alphanumeric and hyphens, min 1 char
  return /^[a-z0-9][a-z0-9-]*$/i.test(name);
}

/**
 * Get all .skr domains owned by a wallet.
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to query
 * @returns Array of .skr domain names (e.g. ["saicharan.skr", "myname.skr"])
 * @throws {InvalidAddressError} If the wallet address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const domains = await getSkrDomains(connection, walletAddress);
 * console.log(domains); // ["saicharan.skr"]
 * ```
 */
export async function getSkrDomains(
  connection: Connection,
  walletAddress: WalletAddress
): Promise<string[]> {
  const pubkey = validateAndParseAddress(walletAddress);

  try {
    const parser = new TldParser(connection);
    const domains = await parser.getParsedAllUserDomainsFromTld(pubkey, SKR_TLD.slice(1));
    return domains.map((d) => d.domain.endsWith(SKR_TLD) ? d.domain : `${d.domain}${SKR_TLD}`);
  } catch {
    return [];
  }
}
