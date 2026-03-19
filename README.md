# seeker-verify

[![npm](https://img.shields.io/npm/v/seeker-verify)](https://www.npmjs.com/package/seeker-verify)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK for verifying Solana Seeker device ownership, resolving .skr domains, and querying SKR token state.

## Install

```bash
npm install seeker-verify
# or
bun add seeker-verify
```

**Peer dependency:** `@solana/web3.js` ^1.95.0

## Quick Start

### Check if a wallet owns a Seeker device

```typescript
import { Connection } from "@solana/web3.js";
import { isSeeker } from "seeker-verify";

const connection = new Connection("https://api.mainnet-beta.solana.com");

if (await isSeeker(connection, walletAddress)) {
  console.log("Verified Seeker owner!");
}
```

### Resolve a .skr domain

```typescript
import { resolveSkrDomain } from "seeker-verify";

const owner = await resolveSkrDomain(connection, "saicharan.skr");
// => "7xKX..."
```

### Get a full Seeker profile

```typescript
import { getSeekerProfile } from "seeker-verify";

const profile = await getSeekerProfile(connection, walletAddress);
// {
//   walletAddress: "7xKX...",
//   isSeeker: true,
//   sgtMintAddress: "SGT...",
//   skrDomain: "saicharan.skr",
//   skrBalance: 1500.5,
//   isStaked: false
// }
```

## API Reference

### SGT Verification

#### `verifySGT(options: SGTVerifyOptions): Promise<SGTResult>`

Core verification function. Checks if a wallet holds a verified Seeker Genesis Token by validating mint authority, metadata pointer, and token group membership against official Solana Mobile constants.

```typescript
interface SGTVerifyOptions {
  connection: Connection;
  walletAddress: string | PublicKey;
  usedMints?: Set<string>; // for anti-sybil
  cache?: boolean;         // default: true
}

interface SGTResult {
  isSeeker: boolean;
  mintAddress: string | null;
  walletAddress: string;
}
```

#### `isSeeker(connection, walletAddress): Promise<boolean>`

Convenience wrapper that returns a simple boolean.

#### `getSGTDetails(connection, walletAddress): Promise<SGTResult>`

Returns full verification result including the SGT mint address.

---

### .skr Domain Resolution

#### `resolveSkrDomain(connection, domain): Promise<string | null>`

Forward resolution: domain name to wallet address. Accepts `"name.skr"` or just `"name"`.

#### `reverseResolveSkr(connection, walletAddress): Promise<string | null>`

Reverse resolution: wallet address to primary .skr domain.

#### `getSkrDomains(connection, walletAddress): Promise<string[]>`

Get all .skr domains owned by a wallet.

#### `isSkrDomain(input: string): boolean`

Validate whether a string is a valid .skr domain format.

---

### SKR Token

#### `getSKRBalance(connection, walletAddress): Promise<SKRBalance>`

Get SKR token balance for a wallet.

```typescript
interface SKRBalance {
  balance: number;    // raw amount
  uiBalance: number;  // human-readable
  walletAddress: string;
}
```

#### `getSKRStakeInfo(connection, walletAddress): Promise<SKRStakeInfo>`

Get SKR staking information. Queries the SKR claim program for staked amounts.

```typescript
interface SKRStakeInfo {
  stakedAmount: number;    // raw amount
  stakedUiAmount: number;  // human-readable
  isStaked: boolean;
  walletAddress: string;
}
```

#### `hasMinSKR(connection, walletAddress, minAmount): Promise<boolean>`

Check if a wallet holds at least `minAmount` SKR (in UI units). Useful for token-gating.

---

### Aggregate

#### `getSeekerProfile(connection, walletAddress): Promise<SeekerProfile>`

Fetches SGT verification, .skr domain, SKR balance, and staking status in parallel. Partial failures are handled gracefully via `Promise.allSettled`.

```typescript
interface SeekerProfile {
  walletAddress: string;
  isSeeker: boolean;
  sgtMintAddress: string | null;
  skrDomain: string | null;
  skrBalance: number;
  isStaked: boolean;
}
```

---

### Cache

#### `LRUCache<T>`

Exported for advanced use. In-memory LRU cache with TTL support used internally by all query functions. Caching is enabled by default and can be disabled via the `cache: false` option where supported.

---

### Error Classes

All errors extend `SeekerVerifyError`:

- `SGTVerificationError` - SGT verification failures
- `DomainResolutionError` - .skr domain resolution failures
- `InvalidAddressError` - Invalid Solana public key
- `RpcError` - RPC connection failures

---

### Constants

All verified on-chain addresses are exported:

```typescript
import {
  SGT_MINT_AUTHORITY,       // GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4
  SGT_METADATA_ADDRESS,     // GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te
  SGT_GROUP_MINT_ADDRESS,   // GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te
  TOKEN_2022_PROGRAM_ID,    // TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
  SKR_MINT_ADDRESS,         // SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
  SKR_TLD,                  // .skr
} from "seeker-verify";
```

## Anti-Sybil Guide

SGTs can be transferred between wallet accounts within the same Seed Vault. This means a single device owner could potentially claim rewards from multiple wallets. To prevent this:

1. Track SGT mint addresses that have already been used for claims
2. Pass the set of used mints to `verifySGT`

```typescript
// Persist this to your database in production
const usedMints = new Set<string>();

async function claimReward(walletAddress: string) {
  const result = await verifySGT({
    connection,
    walletAddress,
    usedMints, // blocks previously claimed SGT mints
  });

  if (!result.isSeeker) {
    throw new Error("Not eligible or already claimed");
  }

  // Record this mint as used
  usedMints.add(result.mintAddress!);

  // ... grant reward
}
```

Each Seeker device has a unique SGT mint address. Even if the token is transferred to a new wallet, the mint address stays the same, making it a reliable anti-sybil identifier.

## Architecture

This SDK queries three on-chain systems:

| Feature | Protocol | Program |
|---------|----------|---------|
| SGT Verification | Token Extensions (Token-2022) | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| .skr Domains | AllDomains | `@onsol/tldparser` |
| SKR Balance | SPL Token | Standard ATA lookups |
| SKR Staking | Merkle Claim | `mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv` |

**SGT Verification Algorithm:**
1. Fetch all Token-2022 token accounts for the wallet
2. Batch-fetch mint account data (100 per request)
3. For each mint, verify three conditions:
   - Mint authority matches `GT2zu...`
   - Metadata pointer authority + address match
   - Token group member's group matches `GT22s...`

**.skr Domains:** Powered by the AllDomains protocol (NOT Bonfida SNS). Uses `@onsol/tldparser` for all resolution.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Install dependencies: `bun install`
4. Make your changes and add tests
5. Run tests: `bun run test`
6. Run build: `bun run build`
7. Submit a pull request

## License

MIT
