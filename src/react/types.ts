/** Async data state returned by all hooks */
export interface UseAsyncResult<T> {
  /** The resolved data, null while loading or on error */
  data: T | null;
  /** Whether the query is in progress */
  loading: boolean;
  /** Error if the query failed, null otherwise */
  error: Error | null;
  /** Manually re-fetch the data */
  refetch: () => void;
}
