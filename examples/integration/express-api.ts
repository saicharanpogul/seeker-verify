/**
 * Express API integration example.
 *
 * A minimal API server that gates endpoints behind Seeker device ownership
 * and SKR token holdings. Shows how seeker-sdk fits into a backend.
 *
 * Run: npx ts-node express-api.ts
 * Requires: npm install express @solana/web3.js seeker-sdk
 */

import { Connection } from "@solana/web3.js";

// In your project: import from "seeker-sdk"
import {
  verifySGT,
  getSeekerProfile,
  hasMinSKR,
  resolveSkrDomain,
  InvalidAddressError,
} from "seeker-sdk";

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL);

// Anti-sybil: track claimed SGT mints (use a database in production)
const claimedMints = new Set<string>();

// --- Route handlers (framework-agnostic) ---

/** GET /api/verify?wallet=<address> */
async function handleVerify(walletAddress: string) {
  const profile = await getSeekerProfile(connection, walletAddress);
  return {
    verified: profile.isSeeker,
    profile,
  };
}

/** POST /api/claim - one reward per Seeker device */
async function handleClaim(walletAddress: string) {
  const result = await verifySGT({
    connection,
    walletAddress,
    usedMints: claimedMints,
  });

  if (!result.isSeeker) {
    const alreadyClaimed = result.mintAddress
      ? claimedMints.has(result.mintAddress)
      : false;
    return {
      success: false,
      reason: alreadyClaimed ? "already_claimed" : "not_seeker",
    };
  }

  claimedMints.add(result.mintAddress!);

  return {
    success: true,
    sgtMint: result.mintAddress,
    message: "Reward claimed!",
  };
}

/** GET /api/premium?wallet=<address> - gated behind 100 SKR */
async function handlePremiumAccess(walletAddress: string) {
  const eligible = await hasMinSKR(connection, walletAddress, 100);
  return {
    access: eligible,
    requiredSKR: 100,
  };
}

/** GET /api/resolve?domain=<name.skr> */
async function handleResolve(domain: string) {
  const owner = await resolveSkrDomain(connection, domain);
  return {
    domain,
    owner,
    found: owner !== null,
  };
}

// --- Simple HTTP server (no Express dependency needed for demo) ---

import { createServer } from "http";

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;

  res.setHeader("Content-Type", "application/json");

  try {
    let result: unknown;

    if (path === "/api/verify") {
      const wallet = url.searchParams.get("wallet");
      if (!wallet) throw new Error("Missing wallet param");
      result = await handleVerify(wallet);
    } else if (path === "/api/claim" && req.method === "POST") {
      const wallet = url.searchParams.get("wallet");
      if (!wallet) throw new Error("Missing wallet param");
      result = await handleClaim(wallet);
    } else if (path === "/api/premium") {
      const wallet = url.searchParams.get("wallet");
      if (!wallet) throw new Error("Missing wallet param");
      result = await handlePremiumAccess(wallet);
    } else if (path === "/api/resolve") {
      const domain = url.searchParams.get("domain");
      if (!domain) throw new Error("Missing domain param");
      result = await handleResolve(domain);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(result, null, 2));
  } catch (err) {
    const status = err instanceof InvalidAddressError ? 400 : 500;
    res.writeHead(status);
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      })
    );
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Seeker verification API running on http://localhost:${PORT}`);
  console.log(`
  Endpoints:
    GET  /api/verify?wallet=<address>    - Full Seeker profile
    POST /api/claim?wallet=<address>     - Claim reward (anti-sybil)
    GET  /api/premium?wallet=<address>   - Check 100 SKR gate
    GET  /api/resolve?domain=<name.skr>  - Resolve .skr domain
  `);
});
