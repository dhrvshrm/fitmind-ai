import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { resolveApiError } from '../../lib/apiClient';

/** Human-readable message for a failed query, or null while it hasn't failed. */
export function queryErrorMessage(error: unknown, fallback: string): string | null {
  return error ? resolveApiError(error, fallback) : null;
}

/** Returns a function that invalidates several query roots at once. */
export function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: QueryKey[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
