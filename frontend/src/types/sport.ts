/** Training for a sport; mirrors backend app/workouts/sports.py. */
export type SportKey =
  | 'football'
  | 'cricket'
  | 'running'
  | 'badminton'
  | 'basketball'
  | 'kabaddi'
  | 'tennis'
  | 'swimming';

export type SportPhase = 'off_season' | 'pre_season' | 'in_season';

/** What the plan was built for; match_day is 0 (Monday) to 6 (Sunday), or null. */
export type SportSetup = {
  sport: SportKey;
  phase: SportPhase;
  match_day: number | null;
};

/** What is saved: "none" switches the sport off, -1 clears the match day. */
export type SportPayload = {
  sport?: SportKey | 'none';
  phase?: SportPhase;
  match_day?: number;
};
