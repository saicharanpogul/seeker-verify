import { describe, it, expect } from "vitest";
import { Keypair, SystemProgram } from "@solana/web3.js";
import {
  createStakeInstruction,
  createUnstakeInstruction,
  createCancelUnstakeInstruction,
  createWithdrawInstruction,
} from "../src/instructions";
import {
  SKR_STAKING_PROGRAM_ID,
  SKR_STAKE_CONFIG,
  SKR_MINT_ADDRESS,
  TOKEN_PROGRAM_ID,
  STAKE_IX_DISCRIMINATOR,
  UNSTAKE_IX_DISCRIMINATOR,
  CANCEL_UNSTAKE_IX_DISCRIMINATOR,
  WITHDRAW_IX_DISCRIMINATOR,
} from "../src/constants";

describe("createStakeInstruction", () => {
  it("creates a valid stake instruction", () => {
    const user = Keypair.generate().publicKey;
    const guardianPool = Keypair.generate().publicKey;
    const amount = BigInt(10_000_000_000);

    const ix = createStakeInstruction({ user, guardianPool, amount });

    expect(ix.programId.equals(SKR_STAKING_PROGRAM_ID)).toBe(true);
    expect(ix.data.length).toBe(16);
    expect(ix.data.slice(0, 8)).toEqual(STAKE_IX_DISCRIMINATOR);
    expect(ix.data.readBigUInt64LE(8)).toBe(amount);

    // Check account list
    expect(ix.keys).toHaveLength(12);
    // user_stake PDA is writable
    expect(ix.keys[0]!.isWritable).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(false);
    // stake_config is writable
    expect(ix.keys[1]!.pubkey.equals(SKR_STAKE_CONFIG)).toBe(true);
    expect(ix.keys[1]!.isWritable).toBe(true);
    // guardian_pool is writable
    expect(ix.keys[2]!.pubkey.equals(guardianPool)).toBe(true);
    // payer is signer + writable
    expect(ix.keys[3]!.pubkey.equals(user)).toBe(true);
    expect(ix.keys[3]!.isSigner).toBe(true);
    expect(ix.keys[3]!.isWritable).toBe(true);
    // user is not signer
    expect(ix.keys[4]!.pubkey.equals(user)).toBe(true);
    expect(ix.keys[4]!.isSigner).toBe(false);
    // mint
    expect(ix.keys[7]!.pubkey.equals(SKR_MINT_ADDRESS)).toBe(true);
    // token_program
    expect(ix.keys[8]!.pubkey.equals(TOKEN_PROGRAM_ID)).toBe(true);
    // system_program
    expect(ix.keys[9]!.pubkey.equals(SystemProgram.programId)).toBe(true);
  });

  it("supports separate payer", () => {
    const user = Keypair.generate().publicKey;
    const payer = Keypair.generate().publicKey;
    const guardianPool = Keypair.generate().publicKey;

    const ix = createStakeInstruction({
      user,
      guardianPool,
      amount: BigInt(1_000_000),
      payer,
    });

    expect(ix.keys[3]!.pubkey.equals(payer)).toBe(true);
    expect(ix.keys[4]!.pubkey.equals(user)).toBe(true);
  });
});

describe("createUnstakeInstruction", () => {
  it("creates a valid unstake instruction with u128 shares", () => {
    const user = Keypair.generate().publicKey;
    const userStake = Keypair.generate().publicKey;
    const guardianPool = Keypair.generate().publicKey;
    const shares = BigInt(5_000_000_000);

    const ix = createUnstakeInstruction({ user, userStake, guardianPool, shares });

    expect(ix.programId.equals(SKR_STAKING_PROGRAM_ID)).toBe(true);
    expect(ix.data.length).toBe(24);
    expect(ix.data.slice(0, 8)).toEqual(UNSTAKE_IX_DISCRIMINATOR);
    // Read u128 LE (low 8 bytes)
    expect(ix.data.readBigUInt64LE(8)).toBe(shares);

    expect(ix.keys).toHaveLength(8);
    expect(ix.keys[0]!.pubkey.equals(userStake)).toBe(true);
    expect(ix.keys[3]!.pubkey.equals(user)).toBe(true);
    expect(ix.keys[3]!.isSigner).toBe(true);
  });
});

describe("createCancelUnstakeInstruction", () => {
  it("creates instruction with no args", () => {
    const user = Keypair.generate().publicKey;
    const userStake = Keypair.generate().publicKey;
    const guardianPool = Keypair.generate().publicKey;

    const ix = createCancelUnstakeInstruction({ user, userStake, guardianPool });

    expect(ix.data.length).toBe(8);
    expect(ix.data).toEqual(CANCEL_UNSTAKE_IX_DISCRIMINATOR);
    expect(ix.keys).toHaveLength(7);
    expect(ix.keys[3]!.isSigner).toBe(true);
  });
});

describe("createWithdrawInstruction", () => {
  it("creates instruction with no args", () => {
    const user = Keypair.generate().publicKey;
    const userStake = Keypair.generate().publicKey;

    const ix = createWithdrawInstruction({ user, userStake });

    expect(ix.data.length).toBe(8);
    expect(ix.data).toEqual(WITHDRAW_IX_DISCRIMINATOR);
    expect(ix.keys).toHaveLength(8);
    // user is signer + writable
    expect(ix.keys[2]!.pubkey.equals(user)).toBe(true);
    expect(ix.keys[2]!.isSigner).toBe(true);
    expect(ix.keys[2]!.isWritable).toBe(true);
  });
});
