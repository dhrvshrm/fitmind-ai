/** Gamification types, aligned with the backend gamification schemas. */

/** Public metadata for a badge (from the catalog or a user's earned list). */
export type Badge = {
  id: string;
  name: string;
  description: string;
};

/** `GET /gamification/profile` -> data. */
export type GamificationProfile = {
  xp: number;
  level: number;
  title: string;
  next_title: string | null;
  xp_into_level: number;
  xp_to_next: number;
  current_streak: number;
  longest_streak: number;
  badges: Badge[];
  badge_count: number;
};

/** `GET /gamification/badges` -> data. */
export type BadgesResponse = {
  earned: Badge[];
  all_badges: Badge[];
};

/** `POST /gamification/xp` -> data. */
export type AwardXpResult = {
  xp_earned: number;
  total_xp: number;
  level: number;
  title: string;
  leveled_up: boolean;
  new_badges: string[];
};
