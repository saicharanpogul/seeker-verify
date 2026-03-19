import { Connection, PublicKey } from "@solana/web3.js";
import { unpackMint } from "@solana/spl-token";
import { getMetadataPointerState } from "@solana/spl-token";
import { getTokenGroupMemberState } from "@solana/spl-token";
import {
  SGT_MINT_AUTHORITY,
  SGT_METADATA_ADDRESS,
  SGT_GROUP_MINT_ADDRESS,
  TOKEN_2022_PROGRAM_ID,
  MINT_BATCH_SIZE,
  SGT_CACHE_TTL,
} from "./constants";
import { SGTResult, SGTVerifyOptions, WalletAddress } from "./types";
import { SGTVerificationError, RpcError } from "./errors";
import { validateAndParseAddress, chunk } from "./utils";
import { LRUCache } from "./cache";

const sgtCache = new LRUCache<SGTResult>({
  maxSize: 500,
  ttlSeconds: SGT_CACHE_TTL,
});

/**
 * Verify if a wallet holds a valid Seeker Genesis Token (SGT).
 *
 * Checks all Token-2022 token accounts owned by the wallet and verifies
 * the mint authority, metadata pointer, and token group membership against
 * the official Solana Mobile SGT constants.
 *
 * @param options - Verification options including connection and wallet address
 * @returns SGT verification result with mint address if verified
 * @throws {InvalidAddressError} If the wallet address is invalid
 * @throws {SGTVerificationError} If mint data cannot be parsed
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const result = await verifySGT({
 *   connection,
 *   walletAddress: "YourWalletAddress...",
 * });
 * if (result.isSeeker) {
 *   console.log("Verified Seeker! SGT mint:", result.mintAddress);
 * }
 * ```
 */
export async function verifySGT(options: SGTVerifyOptions): Promise<SGTResult> {
  const { connection, walletAddress, usedMints, cache = true } = options;
  const pubkey = validateAndParseAddress(walletAddress);
  const walletStr = pubkey.toBase58();

  // Check cache
  if (cache) {
    const cached = sgtCache.get(walletStr);
    if (cached) {
      // Re-check usedMints against cached result
      if (usedMints && cached.mintAddress && usedMints.has(cached.mintAddress)) {
        return { isSeeker: false, mintAddress: cached.mintAddress, walletAddress: walletStr };
      }
      return cached;
    }
  }

  let tokenAccounts;
  try {
    tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_2022_PROGRAM_ID,
    });
  } catch (err) {
    throw new RpcError("Failed to fetch Token-2022 accounts", err);
  }

  if (tokenAccounts.value.length === 0) {
    const result: SGTResult = { isSeeker: false, mintAddress: null, walletAddress: walletStr };
    if (cache) sgtCache.set(walletStr, result);
    return result;
  }

  // Collect all mint addresses from token accounts
  const mintAddresses: PublicKey[] = [];
  for (const account of tokenAccounts.value) {
    const parsed = account.account.data.parsed as {
      info?: { mint?: string };
    };
    const mintStr = parsed.info?.mint;
    if (mintStr) {
      try {
        mintAddresses.push(new PublicKey(mintStr));
      } catch {
        // Skip invalid mint addresses
      }
    }
  }

  if (mintAddresses.length === 0) {
    const result: SGTResult = { isSeeker: false, mintAddress: null, walletAddress: walletStr };
    if (cache) sgtCache.set(walletStr, result);
    return result;
  }

  // Fetch mint account infos in batches
  const batches = chunk(mintAddresses, MINT_BATCH_SIZE);

  for (const batch of batches) {
    let mintInfos;
    try {
      mintInfos = await connection.getMultipleAccountsInfo(batch);
    } catch (err) {
      throw new RpcError("Failed to fetch mint account infos", err);
    }

    for (let i = 0; i < batch.length; i++) {
      const mintInfo = mintInfos[i];
      const mintAddress = batch[i];
      if (!mintInfo || !mintAddress) continue;

      try {
        const mint = unpackMint(mintAddress, mintInfo, TOKEN_2022_PROGRAM_ID);

        // Condition 1: mint authority matches SGT_MINT_AUTHORITY
        if (!mint.mintAuthority || !mint.mintAuthority.equals(SGT_MINT_AUTHORITY)) {
          continue;
        }

        // Condition 2: metadata pointer authority and address match
        const metadataPointer = getMetadataPointerState(mint);
        if (
          !metadataPointer ||
          !metadataPointer.authority ||
          !metadataPointer.metadataAddress ||
          !metadataPointer.authority.equals(SGT_MINT_AUTHORITY) ||
          !metadataPointer.metadataAddress.equals(SGT_METADATA_ADDRESS)
        ) {
          continue;
        }

        // Condition 3: token group member's group matches SGT_GROUP_MINT_ADDRESS
        const groupMember = getTokenGroupMemberState(mint);
        if (
          !groupMember ||
          !groupMember.group ||
          !groupMember.group.equals(SGT_GROUP_MINT_ADDRESS)
        ) {
          continue;
        }

        // All three conditions met - this is a verified SGT
        const mintStr = mintAddress.toBase58();

        // Anti-sybil check
        if (usedMints && usedMints.has(mintStr)) {
          const result: SGTResult = {
            isSeeker: false,
            mintAddress: mintStr,
            walletAddress: walletStr,
          };
          if (cache) sgtCache.set(walletStr, result);
          return result;
        }

        const result: SGTResult = {
          isSeeker: true,
          mintAddress: mintStr,
          walletAddress: walletStr,
        };
        if (cache) sgtCache.set(walletStr, result);
        return result;
      } catch {
        // Failed to unpack this mint - not an SGT, continue
      }
    }
  }

  const result: SGTResult = { isSeeker: false, mintAddress: null, walletAddress: walletStr };
  if (cache) sgtCache.set(walletStr, result);
  return result;
}

/**
 * Convenience function to check if a wallet is a verified Seeker device owner.
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to check
 * @returns true if the wallet holds a verified SGT
 * @throws {InvalidAddressError} If the wallet address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * if (await isSeeker(connection, walletAddress)) {
 *   console.log("This is a Seeker owner!");
 * }
 * ```
 */
export async function isSeeker(
  connection: Connection,
  walletAddress: WalletAddress
): Promise<boolean> {
  const result = await verifySGT({ connection, walletAddress });
  return result.isSeeker;
}

/**
 * Get full SGT details including the mint address for anti-sybil tracking.
 *
 * @param connection - Solana RPC connection
 * @param walletAddress - Wallet address to check
 * @returns SGT verification result with mint address
 * @throws {InvalidAddressError} If the wallet address is invalid
 * @throws {RpcError} If the RPC connection fails
 *
 * @example
 * ```typescript
 * const details = await getSGTDetails(connection, walletAddress);
 * if (details.isSeeker) {
 *   // Track mint address for anti-sybil
 *   usedMints.add(details.mintAddress!);
 * }
 * ```
 */
export async function getSGTDetails(
  connection: Connection,
  walletAddress: WalletAddress
): Promise<SGTResult> {
  return verifySGT({ connection, walletAddress });
}
