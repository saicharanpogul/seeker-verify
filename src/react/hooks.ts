import { useState, useEffect, useCallback, useRef } from "react";
import type { Connection } from "@solana/web3.js";
import type {
  SeekerProfile,
  SGTResult,
  SKRBalance,
  SKRStakeInfo,
  StakingStats,
  GuardianPool,
  WalletAddress,
} from "../types";
import type { UseAsyncResult } from "./types";
import { getSeekerProfile } from "../index";
import { verifySGT } from "../sgt";
import { getSKRBalance } from "../skr-token";
import { getSKRStakeInfo } from "../skr-token";
import { resolveSkrDomain, reverseResolveSkr, isSkrDomain } from "../skr-domains";
import { getStakingStats } from "../staking-stats";
import { getGuardiansForStaker } from "../guardian";

/**
 * Internal hook for async data fetching with stale-closure protection.
 */
function useAsync<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[]
): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const versionRef = useRef(0);

  const execute = useCallback(() => {
    if (!fetcher) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const version = ++versionRef.current;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (versionRef.current === version) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (versionRef.current === version) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
  }, deps); // eslint-disable-line

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

/**
 * Get a complete Seeker profile for a wallet.
 *
 * @param connection - Solana RPC connection (null to skip)
 * @param walletAddress - Wallet address (null to skip)
 * @returns Async result with SeekerProfile
 *
 * @example
 * ```tsx
 * const { data: profile, loading } = useSeeker(connection, walletAddress);
 * if (loading) return <Spinner />;
 * if (profile?.isSeeker) return <Badge>Seeker Owner</Badge>;
 * ```
 */
export function useSeeker(
  connection: Connection | null | undefined,
  walletAddress: WalletAddress | null | undefined
): UseAsyncResult<SeekerProfile> {
  const addr = walletAddress?.toString() ?? null;
  return useAsync(
    connection && addr
      ? () => getSeekerProfile(connection, addr)
      : null,
    [connection, addr]
  );
}

/**
 * Verify SGT ownership for a wallet.
 *
 * @param connection - Solana RPC connection (null to skip)
 * @param walletAddress - Wallet address (null to skip)
 * @returns Async result with SGTResult
 */
export function useSGT(
  connection: Connection | null | undefined,
  walletAddress: WalletAddress | null | undefined
): UseAsyncResult<SGTResult> {
  const addr = walletAddress?.toString() ?? null;
  return useAsync(
    connection && addr
      ? () => verifySGT({ connection, walletAddress: addr })
      : null,
    [connection, addr]
  );
}

/**
 * Get SKR token balance for a wallet.
 *
 * @param connection - Solana RPC connection (null to skip)
 * @param walletAddress - Wallet address (null to skip)
 * @returns Async result with SKRBalance
 */
export function useSKRBalance(
  connection: Connection | null | undefined,
  walletAddress: WalletAddress | null | undefined
): UseAsyncResult<SKRBalance> {
  const addr = walletAddress?.toString() ?? null;
  return useAsync(
    connection && addr
      ? () => getSKRBalance(connection, addr)
      : null,
    [connection, addr]
  );
}

/**
 * Get SKR staking info including yield for a wallet.
 *
 * @param connection - Solana RPC connection (null to skip)
 * @param walletAddress - Wallet address (null to skip)
 * @returns Async result with SKRStakeInfo
 */
export function useSKRStaking(
  connection: Connection | null | undefined,
  walletAddress: WalletAddress | null | undefined
): UseAsyncResult<SKRStakeInfo> {
  const addr = walletAddress?.toString() ?? null;
  return useAsync(
    connection && addr
      ? () => getSKRStakeInfo(connection, addr)
      : null,
    [connection, addr]
  );
}

/**
 * Resolve a .skr domain or reverse-resolve a wallet address.
 *
 * Automatically detects whether input is a domain or wallet address.
 *
 * @param connection - Solana RPC connection (null to skip)
 * @param domainOrWallet - A .skr domain name or wallet address (null to skip)
 * @returns Async result with resolved address or domain name
 */
export function useSkrDomain(
  connection: Connection | null | undefined,
  domainOrWallet: string | null | undefined
): UseAsyncResult<string | null> {
  return useAsync(
    connection && domainOrWallet
      ? () =>
          isSkrDomain(domainOrWallet)
            ? resolveSkrDomain(connection, domainOrWallet)
            : reverseResolveSkr(connection, domainOrWallet)
      : null,
    [connection, domainOrWallet]
  );
}

/**
 * Get global SKR staking statistics.
 *
 * @param connection - Solana RPC connection (null to skip)
 * @returns Async result with StakingStats
 */
export function useStakingStats(
  connection: Connection | null | undefined
): UseAsyncResult<StakingStats> {
  return useAsync(
    connection ? () => getStakingStats(connection) : null,
    [connection]
  );
}

/**
 * Get guardian pools a wallet has staked to.
 *
 * @param connection - Solana RPC connection (null to skip)
 * @param walletAddress - Wallet address (null to skip)
 * @returns Async result with GuardianPool array
 */
export function useGuardians(
  connection: Connection | null | undefined,
  walletAddress: WalletAddress | null | undefined
): UseAsyncResult<GuardianPool[]> {
  const addr = walletAddress?.toString() ?? null;
  return useAsync(
    connection && addr
      ? () => getGuardiansForStaker(connection, addr)
      : null,
    [connection, addr]
  );
}
