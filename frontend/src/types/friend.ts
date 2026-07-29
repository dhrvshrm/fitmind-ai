/** Friend/leaderboard types, aligned with the backend friend schemas. */

export type FriendshipStatus = "none" | "self" | "pending" | "accepted";

/** An accepted friend's public profile, as returned by `GET /friends/list`. */
export type Friend = {
  id: string;
  username: string;
  level: number;
  xp: number;
  current_streak: number;
};

/** A pending incoming request, as returned by `GET /friends/requests`. */
export type FriendRequest = {
  request_id: string;
  user_id: string;
  username: string;
  level: number;
  created_at: string;
};

/** `GET /friends/{username}` -> data. */
export type UserSearchResult = {
  id: string;
  username: string;
  level: number;
  friendship_status: FriendshipStatus;
};

/** One row of `GET /leaderboard/weekly` -> data.leaderboard. */
export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  username: string;
  weekly_xp: number;
  level: number;
  is_me: boolean;
};
