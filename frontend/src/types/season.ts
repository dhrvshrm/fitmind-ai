/** Seasons where someone lives; mirrors backend app/nutrition/seasons.py. */
export type Season = "summer" | "monsoon" | "winter" | "mild";

export type ClimateZone = "cold_hill" | "north" | "west" | "east" | "south";

/** The season where the user lives and what it means for their plan. */
export type SeasonView = {
  region: string;
  zone: ClimateZone;
  season: Season;
  in_season: string[];
  out_of_season: string[];
  follow_taseer: boolean | null;
};

/** `GET /diet-plans/season` -> data. `season` is null without a known Indian place. */
export type SeasonStatus = {
  region: string | null;
  /** Plans follow the season only when this is on; off, they use everyday foods. */
  follow_season: boolean;
  follow_taseer: boolean;
  season: SeasonView | null;
};
