/**
 * Basic SGT verification example.
 *
 * Checks if a wallet address holds a verified Seeker Genesis Token,
 * confirming the user owns a Solana Seeker device.
 */
import { Connection } from "@solana/web3.js";
import { isSeeker, getSGTDetails } from "seeker-sdk";

const RPC_URL = "https://api.mainnet-beta.solana.com";

async function main() {
  const connection = new Connection(RPC_URL);
  const walletAddress = process.argv[2];

  if (!walletAddress) {
    console.log("Usage: npx ts-node verify-seeker.ts <wallet-address>");
    process.exit(1);
  }

  // Simple boolean check
  const verified = await isSeeker(connection, walletAddress);
  console.log(`Is Seeker owner: ${verified}`);

  // Get full details including the SGT mint address
  const details = await getSGTDetails(connection, walletAddress);
  console.log("SGT Details:", {
    isSeeker: details.isSeeker,
    mintAddress: details.mintAddress,
    walletAddress: details.walletAddress,
  });
}

main().catch(console.error);
