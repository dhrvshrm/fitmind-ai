/** Recovery types, aligned with the backend recovery schemas. */

/** Body POSTed to `/recovery/log`. Quality/stress/soreness are 1–5 scales. */
export type RecoveryLogPayload = {
  sleep_hours: number;
  sleep_quality: number;
  stress_level: number;
  muscle_soreness: number;
};

/** `POST /recovery/log` -> data. */
export type RecoveryLogResult = {
  recovery_score: number;
  recommendation: string;
};

/** `GET /recovery/score/today` -> data. */
export type RecoveryScoreData = {
  score: number;
  recommendation: string;
  explanation: string;
};

/** One point in `GET /recovery/history` -> data.history. */
export type RecoveryHistoryItem = {
  date: string;
  score: number;
};
