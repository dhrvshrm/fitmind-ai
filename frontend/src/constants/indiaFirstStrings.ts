/** Copy for India-first meal planning (Phase 8): fasting modes, grocery list, shift times. */
import type { FastingModeKey, GroceryAisle } from '../types/indiaFirst';

const MODE_NAMES: Record<FastingModeKey, string> = {
  navratri: 'Navratri',
  ekadashi: 'Ekadashi',
  paryushan: 'Jain Paryushan',
  ramadan: 'Ramadan',
};

export const INDIA_FIRST_STRINGS = {
  modeNames: MODE_NAMES,

  slots: {
    sehri: 'Sehri',
    iftar: 'Iftar',
    post_iftar: 'Light meal after iftar',
  },

  fasting: {
    title: 'Fasting and festival modes',
    subtitle: 'Turn one on for your dates and your plan will follow its food rules and timings.',
    add: 'Turn on a mode',
    none: 'No fasting mode is on.',
    active: (mode: string, end: string) => `${mode} is on until ${end}.`,
    upcoming: (mode: string, start: string, end: string) =>
      start === end ? `${mode} on ${start}.` : `${mode} from ${start} to ${end}.`,
    remove: 'Turn off',
    removeAria: (mode: string) => `Turn off ${mode}`,
    removed: 'Fasting mode turned off.',
    loadError: "Couldn't load your fasting modes.",
    error: 'Something went wrong. Please try again.',
    descriptions: {
      navratri: 'Sabudana, kuttu, singhara, rajgira, samak rice, potatoes, dairy and fruit. No grains, pulses, onion, garlic, meat or eggs.',
      ekadashi: 'A single day of vrat food: no grains or pulses, onion or garlic. Add each Ekadashi as its own day.',
      paryushan: 'Jain rules: no onion, garlic, potatoes or other root vegetables, no meat, eggs or honey.',
      ramadan: 'Normal food at sehri before dawn, iftar at sunset and a light meal later. Nothing in the daytime.',
    } satisfies Record<FastingModeKey, string>,
    dialog: {
      title: 'Turn on a fasting or festival mode',
      modeLabel: 'Which one?',
      start: 'Start date',
      end: 'End date',
      singleDay: 'This is a one-day fast.',
      usualLength: (days: number) => `Usually about ${days} days. Change the end date if yours is different.`,
      calendarHint: 'Dates differ by region and calendar, so please check your local calendar.',
      dawn: 'Sehri ends (dawn)',
      sunset: 'Iftar (sunset)',
      ramadanHint: 'Use the timings from your local mosque or calendar. They shift a little each day, so update them when needed.',
      save: 'Turn on',
      saving: 'Saving...',
      cancel: 'Cancel',
      saved: (mode: string) => `${mode} is on. Make a new plan to follow it.`,
    },
  },

  plan: {
    modeChanged: 'Your fasting mode changed after this plan was made. Make a new plan so your meals match it.',
    activeBanner: (mode: string, end: string) => `${mode} mode is on until ${end}. This plan follows it.`,
    shiftAware: (wake: string, sleep: string) =>
      `Meal times follow your own day: up at ${wake}, sleeping at ${sleep}.`,
    shiftAwareShort: 'Meal times follow your shift, not the clock.',
    changeShift: 'Change shift times',
    groceryList: 'Grocery list',
  },

  notes: {
    // Protein ideas that fit the fast, instead of dal, eggs or chicken.
    proteinShortVrat: (grams: number) =>
      `This plan is about ${grams} g short of your protein target. During the fast, curd, paneer, milk, makhana and roasted peanuts help close the gap.`,
    proteinShortJain: (grams: number) =>
      `This plan is about ${grams} g short of your protein target. Dal, chana, curd, paneer and tofu fit Jain rules and help close the gap.`,
    fasting_mode: (mode: string, end: string) =>
      `${mode} mode is on until ${end}. Foods in this plan follow its rules. Traditions differ, so keep to your own family's practice.`,
    fasting_salt: () => 'Cook fasting dishes with sendha namak instead of regular salt.',
    paryushan_practice: () =>
      'Many people also skip green vegetables or eat before sunset during Paryushan. Adjust the plan to your own practice.',
    ramadan_timings: (dawn: string, sunset: string, given: boolean) =>
      given
        ? `Meals are timed for sehri before ${dawn} and iftar at ${sunset}. Drink plenty of water between iftar and sehri.`
        : `Meals use sample timings (sehri before ${dawn}, iftar at ${sunset}). Add your local timings in fasting modes for accurate times.`,
  },

  routine: {
    fastBegins: { title: 'Fast begins', detail: 'Last sips of water before dawn. Nothing more until iftar.' },
  },

  warning: {
    toast: (mode: string, foods: string) => `Logged. Just so you know, ${foods} doesn't fit your ${mode} fast.`,
  },

  shift: {
    title: 'Your shift times',
    description: 'Meal times are worked out from when you wake up and go to sleep. Update these when your shift changes.',
    schedule: 'Work pattern',
    wake: 'Wake up',
    sleep: 'Go to sleep',
    invalid: 'Wake and sleep times should leave 3 to 14 hours of sleep.',
    save: 'Save times',
    saving: 'Saving...',
    cancel: 'Cancel',
    saved: 'Shift times saved. Your meal times have moved to match.',
    error: "Couldn't save your times. Please try again.",
    schedules: {
      day: 'Day job',
      night_shift: 'Night shift',
      rotating_shifts: 'Rotating shifts',
    },
  },

  grocery: {
    title: 'Grocery list',
    subtitle: (days: number) => `Everything in your plan for ${days} days, grouped by aisle.`,
    daysLabel: 'Days',
    days: (n: number) => (n === 1 ? '1 day' : `${n} days`),
    loadError: "Couldn't build your grocery list.",
    empty: 'Your plan has no foods to shop for yet.',
    copy: 'Copy',
    copied: 'Grocery list copied.',
    copyError: "Couldn't copy. Please try printing instead.",
    print: 'Print',
    close: 'Close',
    clearTicks: 'Clear ticks',
    approxNote:
      'Amounts are rounded up to what you would buy and come from typical home recipes, so treat them as a guide.',
    fastingNote: (mode: string) => `This list is for your ${mode} plan.`,
    leftOut: (mode: string, items: string) => `Left out for ${mode}: ${items}. Make those dishes without them.`,
    aisles: {
      vegetables: 'Vegetables',
      fruits: 'Fruits',
      grains_flours: 'Grains and flours',
      pulses: 'Pulses',
      dairy: 'Dairy',
      meat_fish_eggs: 'Meat, fish and eggs',
      spices_others: 'Spices, nuts and others',
      ready_made: 'Ready-made or other',
    } satisfies Record<GroceryAisle, string>,
    readyMadeHint: "We don't have a recipe breakdown for these yet, so they're listed as dishes.",
    units: {
      g: (n: number) => `${n} g`,
      kg: (n: number) => `${n} kg`,
      ml: (n: number) => `${n} ml`,
      l: (n: number) => `${n} L`,
      piece: (n: number) => (n === 1 ? '1 piece' : `${n} pieces`),
    },
    asNeeded: 'as needed',
    servings: (servings: number, unit: string, grams: number) => `${servings} ${unit}, about ${grams} g`,
    usedIn: (dishes: string) => `For ${dishes}`,
    tickAria: (name: string) => `Got ${name}`,
    printTitle: 'FitMind grocery list',
  },

  source: {
    estimate: 'Estimate',
    tooltipEstimate:
      'Not in our food databases yet, so these values are worked out from typical ingredients. Treat them as approximate.',
  },
} as const;
