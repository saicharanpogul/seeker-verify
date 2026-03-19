"use client";

import type { Connection, PublicKey } from "@solana/web3.js";
import { useSeeker } from "seeker-sdk/react";

interface SeekerProfileProps {
  connection: Connection;
  walletAddress: PublicKey;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
          : "bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-green-400" : "bg-gray-500"
        }`}
      />
      {active ? "Verified" : "Not found"}
    </span>
  );
}

function Skeleton() {
  return <div className="h-5 w-24 animate-pulse rounded bg-gray-700" />;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-100">{children}</span>
    </div>
  );
}

export function SeekerProfile({
  connection,
  walletAddress,
}: SeekerProfileProps) {
  const { data: profile, loading, error, refetch } = useSeeker(
    connection,
    walletAddress
  );

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      {/* Card header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">
          Seeker Profile
        </h2>
        <button
          onClick={refetch}
          disabled={loading}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-800 hover:text-gray-200 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error.message}
        </div>
      )}

      {/* Profile data */}
      <div className="divide-y divide-gray-800">
        <Row label="Wallet">
          {loading ? (
            <Skeleton />
          ) : (
            <span className="font-mono text-xs">
              {walletAddress.toBase58().slice(0, 4)}...
              {walletAddress.toBase58().slice(-4)}
            </span>
          )}
        </Row>

        <Row label="SGT Verification">
          {loading ? (
            <Skeleton />
          ) : (
            <StatusBadge active={profile?.isSeeker ?? false} />
          )}
        </Row>

        <Row label=".skr Domain">
          {loading ? (
            <Skeleton />
          ) : profile?.skrDomain ? (
            <span className="text-seeker-400">{profile.skrDomain}</span>
          ) : (
            <span className="text-gray-500">None</span>
          )}
        </Row>

        <Row label="SKR Balance">
          {loading ? (
            <Skeleton />
          ) : (
            <span>
              {(profile?.skrBalance ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-gray-500">SKR</span>
            </span>
          )}
        </Row>

        <Row label="Staking Status">
          {loading ? (
            <Skeleton />
          ) : profile?.isStaked ? (
            <span className="text-seeker-400">Active</span>
          ) : (
            <span className="text-gray-500">Not staked</span>
          )}
        </Row>

        <Row label="Staked Amount">
          {loading ? (
            <Skeleton />
          ) : (
            <span>
              {(profile?.stakedAmount ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-gray-500">SKR</span>
            </span>
          )}
        </Row>

        <Row label="Yield Earned">
          {loading ? (
            <Skeleton />
          ) : (
            <span
              className={
                (profile?.yieldEarned ?? 0) > 0
                  ? "text-seeker-400"
                  : "text-gray-100"
              }
            >
              +
              {(profile?.yieldEarned ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}{" "}
              <span className="text-gray-500">SKR</span>
            </span>
          )}
        </Row>
      </div>
    </div>
  );
}
