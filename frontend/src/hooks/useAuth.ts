import { useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { STRINGS } from '../constants/strings';
import type { Credentials, User } from '../types/auth';

/**
 * The app's single entry point for auth. Wraps the store + service so
 * components never touch either directly.
 *
 * Returns the current `user`/`token`, derived flags, and `login`/`signup`/
 * `logout` actions. Also runs a one-time bootstrap that validates a persisted
 * token against `GET /auth/me` on first mount.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);

  /** Fetch the profile for a freshly issued token; fall back to the email on failure. */
  const hydrateUser = useCallback(
    async (fallbackEmail: string): Promise<User> => {
      try {
        const current = await authService.getCurrentUser();
        setUser(current);
        return current;
      } catch {
        const fallback: User = { id: '', email: fallbackEmail };
        setUser(fallback);
        return fallback;
      }
    },
    [setUser],
  );

  const login = useCallback(
    async (credentials: Credentials) => {
      const { token: issued } = await authService.login(credentials);
      setAuth(issued, null);
      await hydrateUser(credentials.email);
      toast.success(STRINGS.toast.loggedIn);
    },
    [setAuth, hydrateUser],
  );

  /** Register, then immediately log in with the same credentials (auto-login). */
  const signup = useCallback(
    async (credentials: Credentials) => {
      await authService.register(credentials);
      const { token: issued } = await authService.login(credentials);
      setAuth(issued, null);
      await hydrateUser(credentials.email);
      toast.success(STRINGS.toast.signedUp);
    },
    [setAuth, hydrateUser],
  );

  const logout = useCallback(() => {
    authService.logout();
    toast.success(STRINGS.toast.loggedOut);
  }, []);

  return {
    user,
    token,
    isAuthenticated: Boolean(token),
    isBootstrapping,
    login,
    signup,
    logout,
  };
}

/**
 * Runs once at app root: if a token was restored from localStorage, confirm it
 * still resolves a user; otherwise clear it. Toggles `isBootstrapping` so
 * `ProtectedRoute` can show a spinner instead of flashing the login page.
 */
export function useAuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const { token } = useAuthStore.getState();
      if (!token) {
        setBootstrapping(false);
        return;
      }
      try {
        const current = await authService.getCurrentUser();
        if (active) setUser(current);
      } catch {
        if (active) clearAuth();
      } finally {
        if (active) setBootstrapping(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [setUser, clearAuth, setBootstrapping]);
}
