import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

/** Client errors (4xx) won't succeed on retry; only network and 5xx errors are retried. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) return false;
  }
  return failureCount < 1;
}

/**
 * Shared server-state cache. Pages read data through query hooks
 * (`hooks/queries`), and mutations invalidate the keys they affect, so every
 * screen showing the same data stays in sync without manual refetching.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});

// Another user's cached data must never survive a logout or expired session.
useAuthStore.subscribe((state, previous) => {
  if (previous.token && !state.token) queryClient.clear();
});
