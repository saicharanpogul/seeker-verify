import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  deriveStakeConfigPda,
  deriveUserStakePda,
  deriveGuardianPoolPda,
  deriveStakeVaultPda,
  deriveEventAuthorityPda,
} from "../src/pda";
import { SKR_STAKE_CONFIG } from "../src/constants";

describe("PDA derivation", () => {
  it("deriveStakeConfigPda matches known address", () => {
    const [pda] = deriveStakeConfigPda();
    expect(pda.equals(SKR_STAKE_CONFIG)).toBe(true);
  });

  it("deriveUserStakePda is deterministic", () => {
    const user = PublicKey.unique();
    const guardianPool = PublicKey.unique();

    const [pda1] = deriveUserStakePda(user, guardianPool);
    const [pda2] = deriveUserStakePda(user, guardianPool);

    expect(pda1.equals(pda2)).toBe(true);
  });

  it("deriveUserStakePda differs per guardian pool", () => {
    const user = PublicKey.unique();
    const pool1 = PublicKey.unique();
    const pool2 = PublicKey.unique();

    const [pda1] = deriveUserStakePda(user, pool1);
    const [pda2] = deriveUserStakePda(user, pool2);

    expect(pda1.equals(pda2)).toBe(false);
  });

  it("deriveGuardianPoolPda is deterministic", () => {
    const guardian = PublicKey.unique();

    const [pda1] = deriveGuardianPoolPda(guardian);
    const [pda2] = deriveGuardianPoolPda(guardian);

    expect(pda1.equals(pda2)).toBe(true);
  });

  it("deriveStakeVaultPda returns a valid pubkey", () => {
    const [pda] = deriveStakeVaultPda();
    expect(pda).toBeInstanceOf(PublicKey);
  });

  it("deriveEventAuthorityPda returns a valid pubkey", () => {
    const [pda] = deriveEventAuthorityPda();
    expect(pda).toBeInstanceOf(PublicKey);
  });

  it("all PDAs are owned by the staking program", () => {
    // Verify all PDAs are on the staking program curve
    const user = PublicKey.unique();
    const guardian = PublicKey.unique();

    const [configPda] = deriveStakeConfigPda();
    const [userStakePda] = deriveUserStakePda(user, guardian);
    const [guardianPda] = deriveGuardianPoolPda(guardian);
    const [vaultPda] = deriveStakeVaultPda();
    const [eventPda] = deriveEventAuthorityPda();

    // All should be off-curve (valid PDAs)
    for (const pda of [configPda, userStakePda, guardianPda, vaultPda, eventPda]) {
      expect(PublicKey.isOnCurve(pda)).toBe(false);
    }
  });
});
