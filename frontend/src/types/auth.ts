/** Shared authentication types, mirroring the backend contract. */

/** Every backend endpoint wraps its payload in this envelope (see `SuccessResponse`). */
export interface ApiEnvelope<TData> {
  success: boolean;
  message: string;
  data: TData;
}

/** Authenticated user as returned by `GET /auth/me`. */
export interface User {
  id: string;
  email: string;
}

export interface Credentials {
  email: string;
  password: string;
}

/** `POST /auth/login` -> data. */
export interface LoginResponseData {
  token: string;
}

/** `POST /auth/register` -> data. */
export interface RegisterResponseData {
  email: string;
}
