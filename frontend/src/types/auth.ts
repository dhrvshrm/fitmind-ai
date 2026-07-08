/** Shared authentication types, mirroring the backend contract. */

/** Every backend endpoint wraps its payload in this envelope (see `SuccessResponse`). */
export type ApiEnvelope<TData> = {
  success: boolean;
  message: string;
  data: TData;
};

/** Authenticated user as returned by `GET /auth/me`. */
export type User = {
  id: string;
  email: string;
};

export type Credentials = {
  email: string;
  password: string;
};

/** `POST /auth/login` -> data. */
export type LoginResponseData = {
  token: string;
};

/** `POST /auth/register` -> data. */
export type RegisterResponseData = {
  email: string;
};
