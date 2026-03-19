"use client";

import dynamic from "next/dynamic";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SeekerProfile } from "./components/SeekerProfile";
import { StakingStats } from "./components/StakingStats";

// Dynamically import wallet button to avoid SSR issues
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          <span className="text-seeker-400">Seeker</span> SDK Demo
        </h1>
        <p className="mb-8 text-gray-400">
          Connect your wallet to view your Seeker profile and global staking
          stats.
        </p>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {connected && publicKey ? (
          <SeekerProfile
            connection={connection}
            walletAddress={publicKey}
          />
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
            <p className="text-gray-500">
              Connect a Solana wallet to view your Seeker profile.
            </p>
          </div>
        )}

        <StakingStats connection={connection} />
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-800 pt-6 text-center text-sm text-gray-600">
        Built with{" "}
        <a
          href="https://github.com/saicharanpogul/seeker-sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-seeker-400 hover:underline"
        >
          seeker-sdk
        </a>
      </footer>
    </main>
  );
}
