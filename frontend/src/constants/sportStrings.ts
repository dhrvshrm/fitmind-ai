/** Copy for training for a sport. */
import type { SportKey, SportPhase } from '../types/sport';

export const SPORTS: SportKey[] = [
  'football', 'cricket', 'running', 'badminton', 'basketball', 'kabaddi', 'tennis', 'swimming',
];
export const SPORT_PHASES: SportPhase[] = ['off_season', 'pre_season', 'in_season'];
/** Monday first, matching the backend's 0-6. */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const NO_SPORT = 'none';
export const NO_MATCH_DAY = -1;

export const SPORT_STRINGS = {
  names: {
    football: 'Football',
    cricket: 'Cricket',
    running: 'Running',
    badminton: 'Badminton',
    basketball: 'Basketball',
    kabaddi: 'Kabaddi',
    tennis: 'Tennis',
    swimming: 'Swimming',
  } satisfies Record<SportKey, string>,
  phases: {
    off_season: 'Off-season',
    pre_season: 'Pre-season',
    in_season: 'In season',
  } satisfies Record<SportPhase, string>,
  phaseHelp: {
    off_season: 'Build strength: up to four gym days, plus sport conditioning.',
    pre_season: 'Get match-fit: three gym days and more conditioning.',
    in_season: 'Stay fresh: two short gym days, so practice and matches come first.',
  } satisfies Record<SportPhase, string>,
  card: {
    title: 'Train for your sport',
    subtitle:
      'Pick your sport and the plan adds what it needs: the right strength work, injury-proofing drills and a match-week schedule.',
    sport: 'Sport',
    noSport: 'No sport, just fitness',
    phase: 'Season',
    matchDay: 'Match day',
    noMatchDay: 'No fixed match day',
    save: 'Save my sport',
    saving: 'Saving...',
    saved: 'Saved. Make a new plan to train for it.',
    error: 'Could not save. Please try again.',
  },
  changed: 'Your sport, season or match day changed. Make a new plan to train for it.',
  matchDay: 'Match day. Warm up well, drink water through the day, and enjoy it. No gym today.',
  note:
    'Built for your sport: the gym days add what it needs and the other days carry its conditioning and injury-prevention drills.',
  mealNotes: {
    match_day:
      'Match day: most of your carbs come in a familiar meal 3 to 4 hours before the match, with a small snack an hour before and a protein meal after.',
    pre_match: 'Match tomorrow: today is a little higher in carbs, with an easy, familiar dinner.',
  },
};
