/** Medal accent color for the top 3 leaderboard ranks; unranked otherwise. */
export const RANK_MEDAL_COLOR: Record<number, string> = {
  1: "#eab308",
  2: "#94a3b8",
  3: "#c2703d",
};

export function getRankMedalColor(rank: number): string | null {
  return RANK_MEDAL_COLOR[rank] ?? null;
}

/** Leaderboard rows shown at most. */
export const LEADERBOARD_LIMIT = 10;
