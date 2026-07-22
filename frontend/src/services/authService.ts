import { apiClient } from "../lib/apiClient";
import { AUTH_ENDPOINTS } from "../constants/api";
import { useAuthStore } from "../store/authStore";
import type {
  ApiEnvelope,
  Credentials,
  LoginResponseData,
  RegisterResponseData,
  User,
} from "../types/auth";

/**
 * Thin wrapper over the `/auth` endpoints. Each call unwraps the backend
 * `{ success, message, data }` envelope and returns just the `data`.
 */
export const authService = {
  async register(credentials: Credentials): Promise<RegisterResponseData> {
    const { data } = await apiClient.post<ApiEnvelope<RegisterResponseData>>(
      AUTH_ENDPOINTS.REGISTER,
      credentials,
    );
    return data.data;
  },

  async login(credentials: Credentials): Promise<LoginResponseData> {
    const { data } = await apiClient.post<ApiEnvelope<LoginResponseData>>(
      AUTH_ENDPOINTS.LOGIN,
      credentials,
    );
    return data.data;
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.get<ApiEnvelope<User>>(AUTH_ENDPOINTS.ME);
    return data.data;
  },

  /** No server session to invalidate yet - just drop the local credentials. */
  logout(): void {
    useAuthStore.getState().clearAuth();
  },
};
