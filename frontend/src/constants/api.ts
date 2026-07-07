/** Backend base URL (from Vite env) and versioned endpoint paths. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const API_PREFIX = '/api/v1';

export const AUTH_ENDPOINTS = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  ME: '/auth/me',
} as const;

/** localStorage key under which the Zustand auth store is persisted. */
export const AUTH_STORAGE_KEY = 'fitmind-auth';
