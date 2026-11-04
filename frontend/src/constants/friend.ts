/**
 * Theme tone for the top 3 leaderboard ranks (gold, silver, bronze), resolved
 * against the MUI palette so it adapts to light and dark mode. `neutral` maps
 * to the secondary text color. Unranked rows get no tone.
 */
export type RankMedalTone = "warning" | "neutral" | "secondary";

export const RANK_MEDAL_TONE: Record<number, RankMedalTone> = {
  1: "warning",
  2: "neutral",
  3: "secondary",
};

export function getRankMedalTone(rank: number): RankMedalTone | null {
  return RANK_MEDAL_TONE[rank] ?? null;
}

/** Leaderboard rows shown at most. */
export const LEADERBOARD_LIMIT = 10;
