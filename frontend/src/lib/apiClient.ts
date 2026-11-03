import axios, { AxiosError } from 'axios';
import { API_BASE_URL, API_PREFIX, TIMEZONE_HEADER } from '../constants/api';
import { STRINGS } from '../constants/strings';
import { useAuthStore } from '../store/authStore';

/** Shared axios instance pointed at the versioned API. */
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: { 'Content-Type': 'application/json' },
});

/** The browser's IANA timezone (e.g. "Asia/Kolkata"), or null if unavailable. */
function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Attach the bearer token (if any) and the browser's timezone to every
 * outgoing request. The backend uses the timezone to decide the user's
 * "today" for logs, plans and reminders.
 */
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const timezone = browserTimezone();
  if (timezone) {
    config.headers[TIMEZONE_HEADER] = timezone;
  }
  return config;
});

/** True when the server rejected the request's credentials (expired or revoked token). */
export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

/** An expired or revoked token ends the session everywhere in the app. */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isUnauthorizedError(error) && useAuthStore.getState().token) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  },
);

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

/** True when the failed request came back 404 — e.g. "no user with that username". */
export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
