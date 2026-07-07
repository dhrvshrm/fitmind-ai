import axios, { AxiosError } from 'axios';
import { API_BASE_URL, API_PREFIX } from '../constants/api';
import { STRINGS } from '../constants/strings';
import { useAuthStore } from '../store/authStore';

/** Shared axios instance pointed at the versioned API. */
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: { 'Content-Type': 'application/json' },
});

/** Attach the bearer token (if any) to every outgoing request. */
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Turn an axios error into a human-readable message, preferring the backend's
 * envelope message when present, then falling back to network/generic copy.
 */
export function resolveApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; detail?: string }>;
    if (!axiosError.response) {
      return STRINGS.errors.network;
    }
    return (
      axiosError.response.data?.message ??
      axiosError.response.data?.detail ??
      fallback
    );
  }
  return fallback;
}
