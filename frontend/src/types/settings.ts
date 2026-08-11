/** Settings + profile types, aligned with the backend settings schemas. */

import type { FitnessGoal } from "./onboarding";

/** Full profile as returned by `GET /users/profile` (backend `public_dict`). */
export type FullUserProfile = {
  id: string;
  email: string;
  username: string;
  xp: number;
  level: number;
  age: number | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  fitness_goal: FitnessGoal | null;
  experience_level: string | null;
  bmi: number | null;
  tdee: number | null;
  current_streak: number;
  longest_streak: number;
  badges: string[];
};

/** Body for `PUT /settings/profile` — every field optional. */
export type ProfileUpdatePayload = {
  username?: string;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  fitness_goal?: FitnessGoal;
};

/** The six toggleable notification types. */
export type NotificationPreferences = {
  follow: boolean;
  friend_request: boolean;
  nudge: boolean;
  weekly_report: boolean;
  badge_earned: boolean;
  streak_warning: boolean;
};

/** A single notification toggle key. */
export type NotificationPreferenceKey = keyof NotificationPreferences;

/** Body for `POST /settings/change-password`. */
export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};
