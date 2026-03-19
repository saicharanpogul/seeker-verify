/**
 * Anti-sybil content gating example.
 *
 * Demonstrates how to use SGT verification with the usedMints pattern
 * to prevent the same Seeker device from claiming rewards multiple times.
 */
import { Connection } from "@solana/web3.js";
import { verifySGT } from "seeker-verify";

const RPC_URL = "https://api.mainnet-beta.solana.com";

// In production, persist this to a database
const claimedMints = new Set<string>();

async function claimReward(walletAddress: string): Promise<string> {
  const connection = new Connection(RPC_URL);

  const result = await verifySGT({
    connection,
    walletAddress,
    usedMints: claimedMints,
  });

  if (!result.isSeeker) {
    if (result.mintAddress && claimedMints.has(result.mintAddress)) {
      return "This Seeker device has already claimed a reward.";
    }
    return "Not a verified Seeker device owner.";
  }

  // Mark this SGT mint as claimed
  claimedMints.add(result.mintAddress!);

  return `Reward claimed! SGT mint: ${result.mintAddress}`;
}

async function main() {
  const walletAddress = process.argv[2];

  if (!walletAddress) {
    console.log("Usage: npx ts-node gate-content.ts <wallet-address>");
    process.exit(1);
  }

  // First claim attempt
  console.log("First claim:", await claimReward(walletAddress));

  // Second claim attempt (should be rejected if same device)
  console.log("Second claim:", await claimReward(walletAddress));
}

main().catch(console.error);
