# seeker-sdk

[![npm](https://img.shields.io/npm/v/seeker-sdk)](https://www.npmjs.com/package/seeker-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The complete TypeScript SDK for the Solana Seeker ecosystem. Verify device ownership, resolve .skr domains, query SKR token balances, staking with yield, guardian pools, global staking stats, and build stake/unstake transactions — all in one package.

## Install

```bash
npm install seeker-sdk
# or
bun add seeker-sdk
```

**Peer dependency:** `@solana/web3.js` ^1.95.0

## Quick Start

```typescript
import { Connection } from "@solana/web3.js";
import { getSeekerProfile, getStakingStats } from "seeker-sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");

// Full profile in one call
const profile = await getSeekerProfile(connection, walletAddress);
console.log(profile);
// {
//   isSeeker: true,
//   sgtMintAddress: "SGT...",
//   skrDomain: "saicharan.skr",
//   skrBalance: 150.5,
//   isStaked: true,
//   stakedAmount: 10368.86,
//   yieldEarned: 368.86,
// }

// Global staking stats
const stats = await getStakingStats(connection);
console.log(`TVL: ${stats.totalValueLocked} SKR`);
console.log(`Share price: ${stats.sharePriceMultiplier}x`);
```

## API Reference

### SGT Verification

#### `verifySGT(options): Promise<SGTResult>`

Checks if a wallet holds a verified Seeker Genesis Token by validating mint authority, metadata pointer, and token group membership.

```typescript
const result = await verifySGT({ connection, walletAddress, usedMints });
```

#### `isSeeker(connection, walletAddress): Promise<boolean>`

Simple boolean check.

#### `getSGTDetails(connection, walletAddress): Promise<SGTResult>`

Full result with SGT mint address for anti-sybil tracking.

---

### .skr Domain Resolution

```typescript
// Forward: domain -> wallet
const owner = await resolveSkrDomain(connection, "saicharan.skr");

// Reverse: wallet -> domain
const domain = await reverseResolveSkr(connection, walletAddress);

// All domains for a wallet
const domains = await getSkrDomains(connection, walletAddress);

// Validate format
isSkrDomain("saicharan.skr"); // true
```

---

### SKR Token

#### `getSKRBalance(connection, walletAddress): Promise<SKRBalance>`

```typescript
const { uiBalance } = await getSKRBalance(connection, walletAddress);
```

#### `getSKRStakeInfo(connection, walletAddress): Promise<SKRStakeInfo>`

Queries on-chain `UserStake` accounts and computes current value using share price.

```typescript
const stake = await getSKRStakeInfo(connection, walletAddress);
// {
//   isStaked: true,
//   depositedAmount: 10000,    // original deposit
//   currentAmount: 10368.86,   // with yield
//   yieldEarned: 368.86,
//   unstakingAmount: 0,
// }
```

#### `hasMinSKR(connection, walletAddress, minAmount): Promise<boolean>`

Token-gate behind a minimum SKR holding.

---

### Guardian Pools

#### `getGuardianPool(connection, guardianPoolAddress): Promise<GuardianPool | null>`

Get a specific guardian delegation pool's info.

```typescript
const pool = await getGuardianPool(connection, poolAddress);
// { guardian, authority, totalShares, commissionBps, active, accruedCommission }
```

#### `getGuardiansForStaker(connection, walletAddress): Promise<GuardianPool[]>`

Find which guardian(s) a wallet has staked to.

#### `getAllGuardians(connection): Promise<GuardianPool[]>`

List all registered guardian pools.

---

### Staking Stats

#### `getStakingStats(connection): Promise<StakingStats>`

Global staking statistics from the StakeConfig account.

```typescript
const stats = await getStakingStats(connection);
// {
//   totalShares, sharePrice, sharePriceMultiplier,
//   totalValueLocked, minStakeAmount, cooldownSeconds,
//   guardianCount, vaultAddress,
// }
```

---

### Instruction Builders

Build `TransactionInstruction` objects for wallet adapters to sign. No Anchor dependency.

```typescript
import {
  createStakeInstruction,
  createUnstakeInstruction,
  createCancelUnstakeInstruction,
  createWithdrawInstruction,
  deriveUserStakePda,
} from "seeker-sdk";

// Stake 10,000 SKR to a guardian
const stakeIx = createStakeInstruction({
  user: walletPublicKey,
  guardianPool: guardianPoolAddress,
  amount: BigInt(10_000_000_000), // raw amount (6 decimals)
});

// Unstake shares
const [userStakePda] = deriveUserStakePda(walletPublicKey, guardianPoolAddress);
const unstakeIx = createUnstakeInstruction({
  user: walletPublicKey,
  userStake: userStakePda,
  guardianPool: guardianPoolAddress,
  shares: BigInt(10_000_000_000),
});

// Cancel unstake during cooldown
const cancelIx = createCancelUnstakeInstruction({
  user: walletPublicKey,
  userStake: userStakePda,
  guardianPool: guardianPoolAddress,
});

// Withdraw after cooldown
const withdrawIx = createWithdrawInstruction({
  user: walletPublicKey,
  userStake: userStakePda,
});
```

---

### PDA Helpers

```typescript
import {
  deriveStakeConfigPda,
  deriveUserStakePda,
  deriveGuardianPoolPda,
  deriveStakeVaultPda,
} from "seeker-sdk";

const [configPda] = deriveStakeConfigPda();
const [userStakePda] = deriveUserStakePda(user, guardianPool);
const [guardianPda] = deriveGuardianPoolPda(guardian);
const [vaultPda] = deriveStakeVaultPda();
```

---

### Aggregate Profile

#### `getSeekerProfile(connection, walletAddress): Promise<SeekerProfile>`

All queries in parallel with `Promise.allSettled`.

```typescript
interface SeekerProfile {
  walletAddress: string;
  isSeeker: boolean;
  sgtMintAddress: string | null;
  skrDomain: string | null;
  skrBalance: number;
  isStaked: boolean;
  stakedAmount: number;
  yieldEarned: number;
}
```

---

### Error Classes

All extend `SeekerVerifyError`: `SGTVerificationError`, `DomainResolutionError`, `InvalidAddressError`, `RpcError`.

## Anti-Sybil Guide

SGTs can be transferred between wallets in the same Seed Vault. Track mint addresses to prevent double-claiming:

```typescript
const usedMints = new Set<string>(); // persist to DB in production

const result = await verifySGT({
  connection,
  walletAddress,
  usedMints,
});

if (result.isSeeker) {
  usedMints.add(result.mintAddress!);
  // grant reward...
}
```

## Architecture

| Feature | Protocol | Program |
|---------|----------|---------|
| SGT Verification | Token-2022 | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| .skr Domains | AllDomains | `@onsol/tldparser` |
| SKR Balance | SPL Token | Standard ATA lookups |
| SKR Staking | Anchor (decoded IDL) | `SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ` |

Zero Anchor runtime dependency. All account layouts and instruction discriminators are decoded from the on-chain IDL and encoded as raw Buffer operations.

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
