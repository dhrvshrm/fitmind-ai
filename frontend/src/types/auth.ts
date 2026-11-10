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
  username?: string;
  /** What the person asked to be called (accounts made before names may not have one). */
  name?: string | null;
  onboarding_completed?: boolean;
};

export type Credentials = {
  email: string;
  password: string;
};

/** Sign-up details: credentials plus the person's name. */
export type SignupDetails = Credentials & {
  name: string;
};

/** `POST /auth/login` -> data. */
export type LoginResponseData = {
  token: string;
};

/** `POST /auth/register` -> data. */
export type RegisterResponseData = {
  email: string;
};
