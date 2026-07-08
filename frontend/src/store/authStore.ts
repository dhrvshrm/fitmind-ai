import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AUTH_STORAGE_KEY } from '../constants/api';
import type { User } from '../types/auth';

type AuthState = {
  user: User | null;
  token: string | null;
  /** True until the initial "am I still logged in?" check completes on app load. */
  isBootstrapping: boolean;

  setAuth: (token: string, user: User | null) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  setBootstrapping: (value: boolean) => void;
};

/**
 * Single source of truth for auth. The `persist` middleware mirrors `token` and
 * `user` into localStorage (key `fitmind-auth`), so a refresh keeps the session.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isBootstrapping: true,

      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null }),
      setBootstrapping: (value) => set({ isBootstrapping: value }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      // Only persist the durable session data, never transient UI flags.
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
