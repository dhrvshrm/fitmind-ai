import { STRINGS } from '../constants/strings';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

/** Returns an error message for the email field, or `null` when valid. */
export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return STRINGS.validation.emailRequired;
  if (!EMAIL_PATTERN.test(value)) return STRINGS.validation.emailInvalid;
  return null;
}

/** Returns an error message for the password field, or `null` when valid. */
export function validatePassword(password: string): string | null {
  if (!password) return STRINGS.validation.passwordRequired;
  if (password.length < MIN_PASSWORD_LENGTH) return STRINGS.validation.passwordTooShort;
  return null;
}

/** Returns an error message for the confirm-password field, or `null` when valid. */
export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) return STRINGS.validation.confirmRequired;
  if (password !== confirmPassword) return STRINGS.validation.confirmMismatch;
  return null;
}

export type PasswordStrength = {
  /** 0 (empty) to 4 (strong). */
  score: number;
  /** Human label from `STRINGS.passwordStrength.levels`. */
  label: string;
  /** Progress bar fill, 0–100. */
  percent: number;
};

/**
 * Cheap heuristic strength meter: one point each for length >= 8, length >= 12,
 * containing a lowercase+uppercase mix, a digit, and a symbol (capped at 4).
 */
export function getPasswordStrength(password: string): PasswordStrength {
  const levels = STRINGS.passwordStrength.levels;
  if (!password) {
    return { score: 0, label: levels[0], percent: 0 };
  }

  let points = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) points += 1;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  const score = Math.min(points, 4);
  return {
    score,
    label: levels[score],
    percent: (score / 4) * 100,
  };
}
