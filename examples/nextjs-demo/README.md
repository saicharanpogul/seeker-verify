# Seeker SDK - Next.js Demo

A minimal Next.js app demonstrating the [seeker-sdk](https://github.com/saicharanpogul/seeker-sdk) package.

## Features

- Wallet connection via `@solana/wallet-adapter`
- Seeker profile display (SGT verification, .skr domain, SKR balance, staking info with yield)
- Global staking stats (TVL, share price, guardian count)

## Setup

```bash
# Install dependencies
npm install

# (Optional) Set a custom RPC endpoint
echo 'NEXT_PUBLIC_RPC_URL=https://your-rpc-endpoint.com' > .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Notes

- This demo uses Solana **mainnet** by default. Set `NEXT_PUBLIC_RPC_URL` in `.env.local` to use a different RPC endpoint.
- The `seeker-sdk` package must be published to npm (or linked locally via `npm link`) before running this demo.
