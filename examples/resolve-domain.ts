/**
 * .skr domain resolution example.
 *
 * Shows forward resolution (domain -> wallet) and reverse resolution
 * (wallet -> domain) for .skr domains powered by AllDomains protocol.
 */
import { Connection } from "@solana/web3.js";
import {
  resolveSkrDomain,
  reverseResolveSkr,
  getSkrDomains,
  isSkrDomain,
  getSeekerProfile,
} from "seeker-verify";

const RPC_URL = "https://api.mainnet-beta.solana.com";

async function main() {
  const connection = new Connection(RPC_URL);
  const input = process.argv[2];

  if (!input) {
    console.log("Usage: npx ts-node resolve-domain.ts <domain-or-wallet>");
    process.exit(1);
  }

  if (isSkrDomain(input)) {
    // Forward resolution: domain -> wallet
    console.log(`Resolving ${input}...`);
    const owner = await resolveSkrDomain(connection, input);
    if (owner) {
      console.log(`Owner: ${owner}`);

      // Get full Seeker profile for the owner
      const profile = await getSeekerProfile(connection, owner);
      console.log("Seeker Profile:", profile);
    } else {
      console.log("Domain not found.");
    }
  } else {
    // Reverse resolution: wallet -> domain
    console.log(`Looking up domains for ${input}...`);

    const primaryDomain = await reverseResolveSkr(connection, input);
    console.log(`Primary .skr domain: ${primaryDomain ?? "none"}`);

    const allDomains = await getSkrDomains(connection, input);
    console.log(`All .skr domains: ${allDomains.length > 0 ? allDomains.join(", ") : "none"}`);
  }
}

main().catch(console.error);
