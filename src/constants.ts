import { PublicKey } from "@solana/web3.js";

// ── SGT (Seeker Genesis Token) ──────────────────────────────────────────

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

// ── SKR Token ───────────────────────────────────────────────────────────

/** SKR token mint address */
export const SKR_MINT_ADDRESS = new PublicKey(
  "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3"
);

/** SPL Token program ID */
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// ── SKR Staking Program ─────────────────────────────────────────────────

/** SKR staking program ID */
export const SKR_STAKING_PROGRAM_ID = new PublicKey(
  "SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ"
);

/** SKR staking StakeConfig account (PDA of ["stake_config"]) */
export const SKR_STAKE_CONFIG = new PublicKey(
  "4HQy82s9CHTv1GsYKnANHMiHfhcqesYkK6sB3RDSYyqw"
);

/** Share price precision scalar (1e9) */
export const SHARE_PRECISION = BigInt(1_000_000_000);

// ── Anchor discriminators ───────────────────────────────────────────────

/** Anchor discriminator for UserStake accounts */
export const USER_STAKE_DISCRIMINATOR = Buffer.from("6635a36b098a5799", "hex");

/** Anchor discriminator for GuardianDelegationPool accounts */
export const GUARDIAN_POOL_DISCRIMINATOR = Buffer.from("85eeffd6d70bbd17", "hex");

/** Anchor discriminator for StakeConfig accounts */
export const STAKE_CONFIG_DISCRIMINATOR = Buffer.from("ee972b030b973fb0", "hex");

// ── Instruction discriminators ──────────────────────────────────────────

export const STAKE_IX_DISCRIMINATOR = Buffer.from([206, 176, 202, 18, 200, 209, 179, 108]);
export const UNSTAKE_IX_DISCRIMINATOR = Buffer.from([90, 95, 107, 42, 205, 124, 50, 225]);
export const CANCEL_UNSTAKE_IX_DISCRIMINATOR = Buffer.from([64, 65, 53, 227, 125, 153, 3, 167]);
export const WITHDRAW_IX_DISCRIMINATOR = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]);

// ── Account sizes ───────────────────────────────────────────────────────

/** Size of a UserStake account in bytes */
export const USER_STAKE_ACCOUNT_SIZE = 169;

/** Size of a GuardianDelegationPool account in bytes */
export const GUARDIAN_POOL_ACCOUNT_SIZE = 188;

/** Size of a StakeConfig account in bytes */
export const STAKE_CONFIG_ACCOUNT_SIZE = 193;

// ── UserStake field offsets ─────────────────────────────────────────────
// Layout: disc(8) + bump(1) + stake_config(32) + user(32) + guardian_pool(32)
//         + shares(u128) + cost_basis(u128) + cumulative_commission(u128)
//         + unstaking_amount(u64) + unstake_timestamp(i64)

export const USER_STAKE_USER_OFFSET = 41;
export const USER_STAKE_GUARDIAN_POOL_OFFSET = 73;
export const USER_STAKE_SHARES_OFFSET = 105;
export const USER_STAKE_COST_BASIS_OFFSET = 121;
export const USER_STAKE_UNSTAKING_OFFSET = 153;
export const USER_STAKE_UNSTAKE_TIMESTAMP_OFFSET = 161;

// ── GuardianDelegationPool field offsets ─────────────────────────────────
// Layout: disc(8) + stake_config(32) + guardian(32) + authority(32)
//         + total_shares(u128) + cumulative_commission_per_share(u128)
//         + last_share_price(u128) + accrued_commission(u128)
//         + commission_bps(u16) + bump(u8) + active(bool)
//         + deregistered_share_price(u128)

export const GUARDIAN_POOL_STAKE_CONFIG_OFFSET = 8;
export const GUARDIAN_POOL_GUARDIAN_OFFSET = 40;
export const GUARDIAN_POOL_AUTHORITY_OFFSET = 72;
export const GUARDIAN_POOL_TOTAL_SHARES_OFFSET = 104;
export const GUARDIAN_POOL_COMMISSION_BPS_OFFSET = 168;
export const GUARDIAN_POOL_BUMP_OFFSET = 170;
export const GUARDIAN_POOL_ACTIVE_OFFSET = 171;

// ── StakeConfig field offsets ───────────────────────────────────────────
// Layout: disc(8) + bump(1) + authority(32) + mint(32) + stake_vault(32)
//         + min_stake_amount(u64) + cooldown_seconds(u64) + total_shares(u128)
//         + share_price(u128) + ...

export const STAKE_CONFIG_AUTHORITY_OFFSET = 9;
export const STAKE_CONFIG_MINT_OFFSET = 41;
export const STAKE_CONFIG_VAULT_OFFSET = 73;
export const STAKE_CONFIG_MIN_STAKE_OFFSET = 105;
export const STAKE_CONFIG_COOLDOWN_OFFSET = 113;
export const STAKE_CONFIG_TOTAL_SHARES_OFFSET = 121;
export const STAKE_CONFIG_SHARE_PRICE_OFFSET = 137;

// ── .skr domains ────────────────────────────────────────────────────────

/** .skr top-level domain (powered by AllDomains protocol) */
export const SKR_TLD = ".skr";

// ── Misc ────────────────────────────────────────────────────────────────

/** Batch size for getMultipleAccountsInfo calls */
export const MINT_BATCH_SIZE = 100;

/** Default cache TTL for SGT verification (seconds) */
export const SGT_CACHE_TTL = 60;

/** Default cache TTL for domain resolution (seconds) */
export const DOMAIN_CACHE_TTL = 300;

/** Default cache TTL for SKR balance queries (seconds) */
export const SKR_CACHE_TTL = 60;

/** Default cache TTL for guardian pool queries (seconds) */
export const GUARDIAN_CACHE_TTL = 120;

/** Default cache TTL for staking stats queries (seconds) */
export const STAKING_STATS_CACHE_TTL = 30;
