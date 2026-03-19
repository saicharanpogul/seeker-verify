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

/** SKR staking StakeConfig account (PDA of ["stake_config"]) */
export const SKR_STAKE_CONFIG = new PublicKey(
  "4HQy82s9CHTv1GsYKnANHMiHfhcqesYkK6sB3RDSYyqw"
);

/** Anchor discriminator for UserStake accounts */
export const USER_STAKE_DISCRIMINATOR = Buffer.from(
  "6635a36b098a5799",
  "hex"
);

/** Share price precision scalar (1e9) */
export const SHARE_PRECISION = BigInt(1_000_000_000);

/** Size of a UserStake account in bytes */
export const USER_STAKE_ACCOUNT_SIZE = 169;

/**
 * StakeConfig account layout offsets.
 * Layout: disc(8) + bump(1) + authority(32) + mint(32) + stake_vault(32)
 *         + min_stake_amount(u64) + cooldown_seconds(u64) + total_shares(u128)
 *         + share_price(u128) + ...
 */
export const STAKE_CONFIG_SHARE_PRICE_OFFSET = 137;

/**
 * UserStake account layout offsets.
 * Layout: disc(8) + bump(1) + stake_config(32) + user(32) + guardian_pool(32)
 *         + shares(u128) + cost_basis(u128) + cumulative_commission(u128)
 *         + unstaking_amount(u64) + unstake_timestamp(i64)
 */
export const USER_STAKE_USER_OFFSET = 41;
export const USER_STAKE_SHARES_OFFSET = 105;
export const USER_STAKE_COST_BASIS_OFFSET = 121;
export const USER_STAKE_UNSTAKING_OFFSET = 153;

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
