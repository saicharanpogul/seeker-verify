import { PublicKey } from "@solana/web3.js";

/** Seeker Genesis Token (SGT) mint authority */
export const SGT_MINT_AUTHORITY = new PublicKey(
  "GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4"
);

/** SGT metadata address (also used as group mint address) */
export const SGT_METADATA_ADDRESS = new PublicKey(
  "GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te"
);

/** SGT group mint address */
export const SGT_GROUP_MINT_ADDRESS = new PublicKey(
  "GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te"
);

/** Token-2022 (Token Extensions) program ID */
export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

/** SKR token mint address */
export const SKR_MINT_ADDRESS = new PublicKey(
  "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3"
);

/** SKR staking program ID */
export const SKR_STAKING_PROGRAM_ID = new PublicKey(
  "SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ"
);

/** SKR claim/distribution program (Merkle-based) */
export const SKR_CLAIM_PROGRAM_ID = new PublicKey(
  "mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv"
);

/** Anchor discriminator for claim accounts in the merkle program */
export const CLAIM_ACCOUNT_DISCRIMINATOR = Buffer.from(
  "16b7f99df75f9660",
  "hex"
);

/** .skr top-level domain (powered by AllDomains protocol) */
export const SKR_TLD = ".skr";

/** Batch size for getMultipleAccountsInfo calls */
export const MINT_BATCH_SIZE = 100;

/** Default cache TTL for SGT verification (seconds) */
export const SGT_CACHE_TTL = 60;

/** Default cache TTL for domain resolution (seconds) */
export const DOMAIN_CACHE_TTL = 300;

/** Default cache TTL for SKR balance queries (seconds) */
export const SKR_CACHE_TTL = 60;
