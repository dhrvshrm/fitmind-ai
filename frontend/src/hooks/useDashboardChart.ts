import { useEffect, useState } from "react";
import { resolveApiError } from "../lib/apiClient";

/**
 * Fetches one dashboard chart's data on mount. `fetcher` must be a stable
 * reference (a `dashboardService.xyz` method works — those are fixed object
 * properties, not recreated per render) so the effect only runs once.
 */
export function useDashboardChart<T>(
  fetcher: () => Promise<T>,
  errorFallback: string,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Deferred so the effect body itself schedules no state updates synchronously.
    queueMicrotask(async () => {
      try {
        const result = await fetcher();
        if (active) setData(result);
      } catch (err) {
        if (active) setError(resolveApiError(err, errorFallback));
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [fetcher, errorFallback]);

  return { data, loading, error };
}
