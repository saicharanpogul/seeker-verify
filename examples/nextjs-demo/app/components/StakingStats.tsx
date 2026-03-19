"use client";

import type { Connection } from "@solana/web3.js";
import { useStakingStats } from "seeker-sdk/react";

interface StakingStatsProps {
  connection: Connection;
}

function StatCard({
  label,
  value,
  subtitle,
  loading,
}: {
  label: string;
  value: string;
  subtitle?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      {loading ? (
        <div className="h-7 w-28 animate-pulse rounded bg-gray-700" />
      ) : (
        <>
          <p className="text-xl font-bold text-gray-100">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatCooldown(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function StakingStats({ connection }: StakingStatsProps) {
  const { data: stats, loading, error, refetch } = useStakingStats(connection);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      {/* Card header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">
          Global Staking Stats
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

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Value Locked"
          value={stats ? `${formatNumber(stats.totalValueLocked)} SKR` : "--"}
          loading={loading}
        />
        <StatCard
          label="Share Price"
          value={
            stats ? `${stats.sharePriceMultiplier.toFixed(4)}x` : "--"
          }
          subtitle={
            stats
              ? `${((stats.sharePriceMultiplier - 1) * 100).toFixed(2)}% yield`
              : undefined
          }
          loading={loading}
        />
        <StatCard
          label="Guardians"
          value={stats ? stats.guardianCount.toString() : "--"}
          subtitle="Active pools"
          loading={loading}
        />
        <StatCard
          label="Min Stake"
          value={
            stats
              ? `${formatNumber(stats.minStakeAmount)} SKR`
              : "--"
          }
          loading={loading}
        />
        <StatCard
          label="Cooldown"
          value={stats ? formatCooldown(stats.cooldownSeconds) : "--"}
          subtitle="Unstake period"
          loading={loading}
        />
        <StatCard
          label="Total Shares"
          value={
            stats
              ? formatNumber(Number(stats.totalShares) / 1e9)
              : "--"
          }
          subtitle="Scaled (/ 1e9)"
          loading={loading}
        />
      </div>
    </div>
  );
}
