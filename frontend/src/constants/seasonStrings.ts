/** Copy for eating with the season where you live. */
import type { Season } from "../types/season";

const SEASON_NAMES: Record<Season, string> = {
  summer: "Summer",
  monsoon: "Monsoon",
  winter: "Winter",
  mild: "Between seasons",
};

const TIPS: Record<Exclude<Season, "mild">, string> = {
  summer:
    "Hot days: sip water through the day, and chaach, curd, lemon water and juicy fruit help you stay hydrated.",
  monsoon:
    "Monsoon: eat freshly cooked food, wash leafy greens well and go easy on raw street chaat.",
  winter:
    "Cold days: warm dals, soups and khichdi work well, and keep drinking water even when you don't feel thirsty.",
};

export const SEASON_STRINGS = {
  seasons: SEASON_NAMES,
  tips: TIPS,
  card: {
    title: (season: Season, region: string) =>
      season === "mild"
        ? `Between seasons in ${region}`
        : `${SEASON_NAMES[season]} in ${region}`,
    subtitle:
      "Your plan picks what is in season where you live and leaves out what is hard to find fresh.",
    inSeason: "In season now",
    outOfSeason: "Out of season here",
    noneOut:
      "Nothing is out of season right now, so the plan can use everything.",
    staples: "Dal, rice, roti, potato, onion and tomato are fine all year.",
    setupTitle: "Eat with the season",
    offSubtitle:
      "Off: your plan uses everyday foods you can find almost anywhere, all year. Turn it on to plan with what is in season where you live.",
    seasonLabel: "Follow the season",
    seasonHelp:
      "Plans prefer fruits and vegetables in season where you live and leave out ones hard to find fresh.",
    seasonOn: "Seasonal eating is on. Make a new plan to follow it.",
    seasonOff: "Seasonal eating is off. Make a new plan to go back to everyday foods.",
    preview: (season: Season, region: string) =>
      season === "mild"
        ? `Turn it on to follow the season in ${region}.`
        : `Turn it on to follow ${SEASON_NAMES[season].toLowerCase()} in ${region}.`,
    setupBody:
      "Add your city or state and your plan will follow what's in season there.",
    unknown: (region: string) =>
      `We don't have season data for ${region} yet. Try your Indian city or state, like Srinagar, Pune or Kochi.`,
    regionLabel: "City or state",
    save: "Save",
    saving: "Saving...",
    changePlace: "Change place",
    cancel: "Cancel",
    saved: "Saved. Make a new plan to follow the season.",
    error: "Could not save. Please try again.",
    loadError: "Could not load the season.",
    taseerLabel: "Follow taseer (thanda and garam foods)",
    taseerHelp:
      "A traditional practice, not medical advice. When on, winter plans skip cooling foods like cucumber, chaas and raita, and summer plans skip heating ones like bajra, gur and til.",
    taseerOn: "Taseer is on. Make a new plan to follow it.",
    taseerOff: "Taseer is off.",
  },
  stale:
    "The season or your place has changed. Make a new plan to follow what is in season.",
};
