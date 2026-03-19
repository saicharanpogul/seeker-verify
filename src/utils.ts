import { PublicKey } from "@solana/web3.js";
import { InvalidAddressError } from "./errors";
import { WalletAddress } from "./types";

/**
 * Validate and convert a wallet address to a PublicKey.
 * Throws InvalidAddressError if the address is not a valid base58 Solana public key.
 *
 * @param address - Wallet address as string or PublicKey
 * @returns A valid PublicKey instance
 * @throws {InvalidAddressError} If the address is invalid
 */
export function validateAndParseAddress(address: WalletAddress): PublicKey {
  if (address instanceof PublicKey) return address;

  try {
    return new PublicKey(address);
  } catch {
    throw new InvalidAddressError(address);
  }
}

/**
 * Split an array into chunks of a given size.
 *
 * @param array - Array to split
 * @param size - Maximum chunk size
 * @returns Array of chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Read a u128 (little-endian) from a Buffer at the given offset.
 *
 * @param buf - Buffer to read from
 * @param offset - Byte offset
 * @returns BigInt value
 */
export function readU128LE(buf: Buffer, offset: number): bigint {
  const lo = buf.readBigUInt64LE(offset);
  const hi = buf.readBigUInt64LE(offset + 8);
  return lo + (hi << 64n);
}

/**
 * Write a u128 (little-endian) to a Buffer at the given offset.
 *
 * @param buf - Buffer to write to
 * @param value - BigInt value to write
 * @param offset - Byte offset
 */
export function writeU128LE(buf: Buffer, value: bigint, offset: number): void {
  const lo = value & 0xFFFFFFFFFFFFFFFFn;
  const hi = (value >> 64n) & 0xFFFFFFFFFFFFFFFFn;
  buf.writeBigUInt64LE(lo, offset);
  buf.writeBigUInt64LE(hi, offset + 8);
}
