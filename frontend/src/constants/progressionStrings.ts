/**
 * Copy for progressive overload: set logging, today's targets, records,
 * easy weeks, level changes and strength progress.
 */
const kg = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} kg`;
const setsList = (sets: { weight_kg: number; reps: number }[], loaded: boolean) =>
  loaded ? sets.map((s) => `${kg(s.weight_kg)} x ${s.reps}`).join(', ') : sets.map((s) => `${s.reps}`).join(', ') + ' reps';

export const PROGRESSION_STRINGS = {
  logger: {
    weight: 'kg',
    reps: 'reps',
    weightAria: (exercise: string, set: number) => `${exercise} set ${set} weight in kg`,
    repsAria: (exercise: string, set: number) => `${exercise} set ${set} reps`,
    doneAria: (exercise: string, set: number) => `Mark ${exercise} set ${set} done`,
    setLabel: (n: number) => `Set ${n}`,
    feltLabel: 'How did it feel?',
    felt: { easy: 'Easy', right: 'Just right', hard: 'Hard' },
  },
  target: {
    last: (sets: { weight_kg: number; reps: number }[], loaded: boolean) => `Last time: ${setsList(sets, loaded)}`,
    first_time: 'First time logging this one. Pick a weight you can lift with good form.',
    first_time_bodyweight: 'First time logging this one. Stop a couple of reps before your form breaks.',
    add_weight: (weight: number) => `You hit the top of the range. Today try ${kg(weight)}.`,
    add_reps: (weight: number | null, low: number, high: number) =>
      weight ? `Stay at ${kg(weight)} and add a rep or two (aim for ${low} to ${high}).` : `Add a rep or two (aim for ${low} to ${high}).`,
    hold: (weight: number) => `Stay at ${kg(weight)} and own every rep today.`,
    reduce: (weight: number) => `Two tough sessions in a row. Drop to ${kg(weight)} and build back up.`,
    harder_variation: (name: string) => `You've outgrown this one. Try ${name} next time.`,
    add_set: 'You hit the top of the range. Add an extra set next time.',
    deload: (weight: number | null) => (weight ? `Easy week: keep ${kg(weight)}, fewer sets, no grinding.` : 'Easy week: fewer sets, no grinding.'),
  },
  chips: {
    add_weight: 'Add weight',
    add_reps: 'Add reps',
    hold: 'Hold',
    reduce: 'Ease off',
    harder_variation: 'Level up the move',
    add_set: 'Add a set',
    deload: 'Easy week',
    first_time: 'First time',
  },
  records: {
    title: 'New personal records',
    weight: (name: string, value: number, previous: number) => `${name}: ${kg(value)} (was ${kg(previous)})`,
    estimated_max: (name: string, value: number, previous: number) =>
      `${name}: estimated max ${kg(value)} (was ${kg(previous)})`,
    reps: (name: string, value: number, previous: number) => `${name}: ${value} reps (was ${previous})`,
  },
  coach: {
    title: 'Your training',
    subtitle: 'Suggestions from what you log. Nothing changes until you say so.',
    deloadActive: (until: string) => `Easy week until ${until}. Fewer sets, same weights. Come back fresh.`,
    endDeload: 'End easy week',
    deloadTitle: 'Time for an easy week?',
    deloadBody: (lifts: string[]) =>
      `${lifts.join(' and ')} haven't moved in about three weeks. A lighter week usually gets them going again.`,
    startDeload: 'Start easy week',
    reasonsTitle: 'Worth fixing first',
    reasons: {
      protein: (percent: number, days: number) =>
        `Protein averaged ${percent}% of your target over ${days} logged days. Muscle needs it to grow.`,
      sleep: (hours: number) => `Sleep averaged ${hours} hours. Strength comes back best with 7 or more.`,
      recovery: (score: number) => `Recovery scores averaged ${score}. Your body may need more rest between hard days.`,
    },
    notNow: 'Not now',
    levelReadyTitle: (level: string) => `Ready for ${level}?`,
    levelReadyBody:
      'You have trained consistently and your lifts are strong for your body weight. Moving up adds more weekly sets and harder exercises.',
    levelUp: (level: string) => `Move to ${level}`,
    levelProgressTitle: (level: string) => `Road to ${level}`,
    workouts: (done: number, needed: number, weeks: number) => `${done} of ${needed} workouts in the last ${weeks} weeks`,
    workoutsHint: (days: number) => `Based on your ${days}-day week: about 3 of every 4 planned sessions.`,
    lifts: (met: number, needed: number) => `${met} of ${needed} lifts at the strength mark`,
    bodyweightNote: 'Log your sets to track strength. With bodyweight training, hitting the top of your rep ranges counts.',
    liftRow: (pattern: string, ratio: number, needed: number) => `${pattern}: ${ratio}x body weight (aim ${needed}x)`,
    levelUpDone: (level: string) => `You're now ${level}. Your new plan is ready.`,
    deloadStarted: 'Easy week started',
    deloadEnded: 'Back to normal training',
    error: "Couldn't update that. Try again.",
    levels: { beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' } as Record<string, string>,
    patterns: {
      squat: 'Squat',
      hinge: 'Hinge',
      push_horizontal: 'Press',
      pull_horizontal: 'Row',
      push_vertical: 'Overhead press',
    } as Record<string, string>,
  },
  strength: {
    title: 'Strength',
    subtitle: 'Estimated one-rep max from your logged sets.',
    emptyTitle: 'No weighted lifts logged yet',
    emptyBody: 'Enter weight and reps when you log a workout and your strength trend shows up here.',
    change: (percent: number, days: number) => `${percent > 0 ? '+' : ''}${percent}% in ${Math.round(days / 7)} weeks`,
    noChange: 'Needs a few more sessions',
    current: (value: number) => kg(value),
    sessions: (n: number) => `${n} ${n === 1 ? 'session' : 'sessions'}`,
    error: "Couldn't load your strength progress.",
  },
} as const;
