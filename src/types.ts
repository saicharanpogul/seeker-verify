import { Connection, PublicKey } from "@solana/web3.js";

/** Result of SGT verification */
export interface SGTResult {
  /** Whether the wallet owns a verified Seeker Genesis Token */
  isSeeker: boolean;
  /** The SGT's unique mint address (one per device), null if not a Seeker */
  mintAddress: string | null;
  /** The wallet address that was checked */
  walletAddress: string;
}

/** Options for SGT verification */
export interface SGTVerifyOptions {
  /** Solana RPC connection */
  connection: Connection;
  /** Wallet address to verify */
  walletAddress: string | PublicKey;
  /** Previously used SGT mint addresses for anti-sybil protection */
  usedMints?: Set<string>;
  /** Enable caching of results (default: true) */
  cache?: boolean;
}

/** Result of .skr domain resolution */
export interface SkrDomainResult {
  /** The full domain name (e.g. "saicharan.skr") */
  domain: string;
  /** The owner's wallet public key */
  ownerAddress: string;
}

/** SKR token balance information */
export interface SKRBalance {
  /** Raw token amount in smallest units */
  balance: number;
  /** Human-readable balance with decimals applied */
  uiBalance: number;
  /** The wallet address queried */
  walletAddress: string;
}

/** SKR staking information */
export interface SKRStakeInfo {
  /** Whether the wallet has any SKR staked */
  isStaked: boolean;
  /** Original deposited amount (UI units) */
  depositedAmount: number;
  /** Current value including yield (UI units) */
  currentAmount: number;
  /** Yield earned (UI units): currentAmount - depositedAmount */
  yieldEarned: number;
  /** Amount currently unstaking / in cooldown (UI units) */
  unstakingAmount: number;
  /** The wallet address queried */
  walletAddress: string;
}

/** Aggregate Seeker profile combining all verification data */
export interface SeekerProfile {
  /** The wallet address */
  walletAddress: string;
  /** Whether the wallet holds a verified SGT */
  isSeeker: boolean;
  /** The SGT mint address if verified, null otherwise */
  sgtMintAddress: string | null;
  /** The .skr domain owned by this wallet, null if none */
  skrDomain: string | null;
  /** SKR token balance in wallet (UI amount) */
  skrBalance: number;
  /** Whether the wallet has staked SKR */
  isStaked: boolean;
  /** Current staked value including yield (UI amount) */
  stakedAmount: number;
  /** Yield earned from staking (UI amount) */
  yieldEarned: number;
}

/** Guardian delegation pool information */
export interface GuardianPool {
  /** The guardian pool account address */
  address: string;
  /** The guardian's public key (PDA seed, immutable) */
  guardian: string;
  /** The operational authority for the guardian */
  authority: string;
  /** Total shares delegated to this guardian */
  totalShares: bigint;
  /** Commission rate in basis points (0-10,000) */
  commissionBps: number;
  /** Whether this guardian pool is active */
  active: boolean;
  /** Accrued but unclaimed commission (raw) */
  accruedCommission: bigint;
}

/** Global staking statistics */
export interface StakingStats {
  /** Total shares outstanding across all stakers */
  totalShares: bigint;
  /** Current share price (scaled by 1e9) */
  sharePrice: bigint;
  /** Share price as a human-readable multiplier (e.g., 1.036 means 3.6% yield) */
  sharePriceMultiplier: number;
  /** Total value locked in the stake vault (UI units) */
  totalValueLocked: number;
  /** Minimum stake amount in SKR (UI units) */
  minStakeAmount: number;
  /** Cooldown period in seconds before unstaked tokens can be withdrawn */
  cooldownSeconds: number;
  /** Number of active guardian pools */
  guardianCount: number;
  /** Stake vault address */
  vaultAddress: string;
}

/** Options for functions that support caching */
export interface CacheOptions {
  /** Enable caching of results (default: true) */
  cache?: boolean;
}

/** Configuration for the LRU cache */
export interface CacheConfig {
  /** Maximum number of entries in the cache */
  maxSize: number;
  /** Time-to-live in seconds */
  ttlSeconds: number;
}

/** A wallet address input that can be either a string or PublicKey */
export type WalletAddress = string | PublicKey;

/** Helper to convert WalletAddress to string */
export function toWalletString(address: WalletAddress): string {
  if (typeof address === "string") return address;
  return address.toBase58();
}

/** Helper to convert WalletAddress to PublicKey */
export function toPublicKey(address: WalletAddress): PublicKey {
  if (typeof address === "string") return new PublicKey(address);
  return address;
}
