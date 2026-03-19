import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  SKR_STAKING_PROGRAM_ID,
  SKR_STAKE_CONFIG,
  SKR_MINT_ADDRESS,
  TOKEN_PROGRAM_ID,
  STAKE_IX_DISCRIMINATOR,
  UNSTAKE_IX_DISCRIMINATOR,
  CANCEL_UNSTAKE_IX_DISCRIMINATOR,
  WITHDRAW_IX_DISCRIMINATOR,
} from "./constants";
import { writeU128LE } from "./utils";
import {
  deriveUserStakePda,
  deriveStakeVaultPda,
  deriveEventAuthorityPda,
} from "./pda";

/**
 * Create a stake instruction to deposit SKR tokens into a guardian pool.
 *
 * Builds a TransactionInstruction that can be signed by a wallet adapter.
 * Does NOT sign or send the transaction.
 *
 * @param params - Stake parameters
 * @param params.user - User's wallet public key (the staker)
 * @param params.guardianPool - Guardian pool to delegate to
 * @param params.amount - Amount of SKR to stake (raw, in smallest units)
 * @param params.payer - Payer for account creation (defaults to user)
 * @returns TransactionInstruction
 *
 * @example
 * ```typescript
 * const ix = createStakeInstruction({
 *   user: walletPublicKey,
 *   guardianPool: new PublicKey("..."),
 *   amount: BigInt(10_000_000_000), // 10,000 SKR
 * });
 * const tx = new Transaction().add(ix);
 * ```
 */
export function createStakeInstruction(params: {
  user: PublicKey;
  guardianPool: PublicKey;
  amount: bigint;
  payer?: PublicKey;
}): TransactionInstruction {
  const { user, guardianPool, amount, payer = user } = params;

  const [userStakePda] = deriveUserStakePda(user, guardianPool);
  const [stakeVault] = deriveStakeVaultPda();
  const [eventAuthority] = deriveEventAuthorityPda();
  const userTokenAccount = getAssociatedTokenAddressSync(SKR_MINT_ADDRESS, user);

  // Serialize: discriminator(8) + amount(u64, 8) = 16 bytes
  const data = Buffer.alloc(16);
  STAKE_IX_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(amount, 8);

  return new TransactionInstruction({
    programId: SKR_STAKING_PROGRAM_ID,
    keys: [
      { pubkey: userStakePda, isSigner: false, isWritable: true },
      { pubkey: SKR_STAKE_CONFIG, isSigner: false, isWritable: true },
      { pubkey: guardianPool, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: user, isSigner: false, isWritable: false },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: SKR_MINT_ADDRESS, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: SKR_STAKING_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create an unstake instruction to initiate withdrawal with cooldown.
 *
 * After unstaking, tokens enter a cooldown period before they can be withdrawn.
 * The unstaking amount is calculated at unstake time using the current share price.
 *
 * @param params - Unstake parameters
 * @param params.user - User's wallet public key
 * @param params.userStake - UserStake PDA account
 * @param params.guardianPool - Guardian pool the stake is delegated to
 * @param params.shares - Number of shares to unstake (u128)
 * @returns TransactionInstruction
 *
 * @example
 * ```typescript
 * const ix = createUnstakeInstruction({
 *   user: walletPublicKey,
 *   userStake: userStakePda,
 *   guardianPool: new PublicKey("..."),
 *   shares: BigInt(10_000_000_000),
 * });
 * ```
 */
export function createUnstakeInstruction(params: {
  user: PublicKey;
  userStake: PublicKey;
  guardianPool: PublicKey;
  shares: bigint;
}): TransactionInstruction {
  const { user, userStake, guardianPool, shares } = params;

  const [stakeVault] = deriveStakeVaultPda();
  const [eventAuthority] = deriveEventAuthorityPda();

  // Serialize: discriminator(8) + shares(u128, 16) = 24 bytes
  const data = Buffer.alloc(24);
  UNSTAKE_IX_DISCRIMINATOR.copy(data, 0);
  writeU128LE(data, shares, 8);

  return new TransactionInstruction({
    programId: SKR_STAKING_PROGRAM_ID,
    keys: [
      { pubkey: userStake, isSigner: false, isWritable: true },
      { pubkey: SKR_STAKE_CONFIG, isSigner: false, isWritable: true },
      { pubkey: guardianPool, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: stakeVault, isSigner: false, isWritable: false },
      { pubkey: SKR_MINT_ADDRESS, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: SKR_STAKING_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create a cancel unstake instruction to restore shares during cooldown.
 *
 * Can only be called while the cooldown period is active (before withdrawal).
 * Restores the shares and clears the unstaking state.
 *
 * @param params - Cancel unstake parameters
 * @param params.user - User's wallet public key
 * @param params.userStake - UserStake PDA account
 * @param params.guardianPool - Guardian pool the stake is delegated to
 * @returns TransactionInstruction
 *
 * @example
 * ```typescript
 * const ix = createCancelUnstakeInstruction({
 *   user: walletPublicKey,
 *   userStake: userStakePda,
 *   guardianPool: new PublicKey("..."),
 * });
 * ```
 */
export function createCancelUnstakeInstruction(params: {
  user: PublicKey;
  userStake: PublicKey;
  guardianPool: PublicKey;
}): TransactionInstruction {
  const { user, userStake, guardianPool } = params;

  const [stakeVault] = deriveStakeVaultPda();
  const [eventAuthority] = deriveEventAuthorityPda();

  // No args, just discriminator
  const data = Buffer.alloc(8);
  CANCEL_UNSTAKE_IX_DISCRIMINATOR.copy(data, 0);

  return new TransactionInstruction({
    programId: SKR_STAKING_PROGRAM_ID,
    keys: [
      { pubkey: userStake, isSigner: false, isWritable: true },
      { pubkey: SKR_STAKE_CONFIG, isSigner: false, isWritable: true },
      { pubkey: guardianPool, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: stakeVault, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: SKR_STAKING_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create a withdraw instruction to claim tokens after cooldown completes.
 *
 * Can only be called after the cooldown period has elapsed following an unstake.
 * Transfers tokens from the stake vault to the user's token account.
 *
 * @param params - Withdraw parameters
 * @param params.user - User's wallet public key
 * @param params.userStake - UserStake PDA account
 * @returns TransactionInstruction
 *
 * @example
 * ```typescript
 * const ix = createWithdrawInstruction({
 *   user: walletPublicKey,
 *   userStake: userStakePda,
 * });
 * ```
 */
export function createWithdrawInstruction(params: {
  user: PublicKey;
  userStake: PublicKey;
}): TransactionInstruction {
  const { user, userStake } = params;

  const [stakeVault] = deriveStakeVaultPda();
  const [eventAuthority] = deriveEventAuthorityPda();
  const userTokenAccount = getAssociatedTokenAddressSync(SKR_MINT_ADDRESS, user);

  // No args, just discriminator
  const data = Buffer.alloc(8);
  WITHDRAW_IX_DISCRIMINATOR.copy(data, 0);

  return new TransactionInstruction({
    programId: SKR_STAKING_PROGRAM_ID,
    keys: [
      { pubkey: userStake, isSigner: false, isWritable: true },
      { pubkey: SKR_STAKE_CONFIG, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: SKR_STAKING_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}
