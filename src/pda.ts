import { PublicKey } from "@solana/web3.js";
import { SKR_STAKING_PROGRAM_ID, SKR_STAKE_CONFIG } from "./constants";

/**
 * Derive the StakeConfig PDA.
 *
 * @returns [pda, bump]
 */
export function deriveStakeConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake_config")],
    SKR_STAKING_PROGRAM_ID
  );
}

/**
 * Derive a UserStake PDA for a given user and guardian pool.
 *
 * @param user - User's wallet public key
 * @param guardianPool - Guardian pool public key
 * @param stakeConfig - StakeConfig public key (defaults to known address)
 * @returns [pda, bump]
 */
export function deriveUserStakePda(
  user: PublicKey,
  guardianPool: PublicKey,
  stakeConfig: PublicKey = SKR_STAKE_CONFIG
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_stake"),
      stakeConfig.toBuffer(),
      user.toBuffer(),
      guardianPool.toBuffer(),
    ],
    SKR_STAKING_PROGRAM_ID
  );
}

/**
 * Derive a GuardianDelegationPool PDA for a given guardian.
 *
 * @param guardian - Guardian's public key
 * @param stakeConfig - StakeConfig public key (defaults to known address)
 * @returns [pda, bump]
 */
export function deriveGuardianPoolPda(
  guardian: PublicKey,
  stakeConfig: PublicKey = SKR_STAKE_CONFIG
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("guardian_pool"),
      stakeConfig.toBuffer(),
      guardian.toBuffer(),
    ],
    SKR_STAKING_PROGRAM_ID
  );
}

/**
 * Derive the stake vault PDA.
 *
 * @param stakeConfig - StakeConfig public key (defaults to known address)
 * @returns [pda, bump]
 */
export function deriveStakeVaultPda(
  stakeConfig: PublicKey = SKR_STAKE_CONFIG
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake_vault"), stakeConfig.toBuffer()],
    SKR_STAKING_PROGRAM_ID
  );
}

/**
 * Derive the event authority PDA (used internally by Anchor events).
 *
 * @returns [pda, bump]
 */
export function deriveEventAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    SKR_STAKING_PROGRAM_ID
  );
}
