/** Copy for the Today screen, reminders and the installable app (Phase 7). */
export const TODAY_STRINGS = {
  nav: 'Today',
  title: 'Today',
  greeting: {
    morning: (name: string) => (name ? `Good morning, ${name}` : 'Good morning'),
    afternoon: (name: string) => (name ? `Good afternoon, ${name}` : 'Good afternoon'),
    evening: (name: string) => (name ? `Good evening, ${name}` : 'Good evening'),
  },
  subtitle: "Here's your day. One tap is all most things take.",
  loadError: "Couldn't load your day. Check your connection and try again.",

  setup: {
    building: 'Your meal plan is being put together. It will show up here in a moment.',
    ready: 'Your plans are ready. Here is your first day.',
  },

  restart: {
    title: 'Welcome back',
    body: (days: number) =>
      days > 6
        ? "It's been a little while. No catching up needed, just start with your next meal."
        : `You've had ${days} quiet days. That's normal. Pick up with one small thing today.`,
    action: 'Log my next meal',
    actionNoPlan: 'Log a meal',
    dismiss: 'Not now',
  },

  meal: {
    title: 'Next meal',
    at: (time: string) => `Around ${time}`,
    log: 'I ate this',
    logging: 'Logging...',
    logged: 'Logged. Nice one.',
    logError: "Couldn't log that meal. Please try again.",
    allDone: "That's every meal in your plan for today. Well done.",
    allDoneHint: 'Had something extra? You can still log it.',
    logOther: 'Log something else',
    noPlanTitle: 'No meal plan yet',
    noPlanBody: 'Get a full day of Indian meals that fits your targets, built in seconds.',
    createPlan: 'Make my meal plan',
    creatingPlan: 'Making your plan...',
    createError: "Couldn't make your plan right now. Please try again in a bit.",
    viewPlan: 'See full plan',
    kcal: (n: number) => `${Math.round(n)} kcal`,
    protein: (n: number) => `${Math.round(n)} g protein`,
    more: (n: number) => `+${n} more`,
    later: (n: number) => (n === 1 ? '1 more meal later' : `${n} more meals later`),
  },

  workout: {
    title: "Today's workout",
    restTitle: 'Rest day',
    restBody: 'Recovery is part of training. A short walk is plenty today.',
    doneTitle: 'Workout done',
    doneBody: 'You trained today. Rest up and refuel.',
    exercises: (n: number) => (n === 1 ? '1 exercise' : `${n} exercises`),
    start: 'Start workout',
    quick: 'Short on time? 15-minute session',
    quickStarting: 'Setting it up...',
    quickError: "Couldn't set up a quick session. Please try again.",
    quickLabel: (minutes: number) => `${minutes}-minute session`,
    lightDay: 'Lighter today, based on your recovery',
    noPlanTitle: 'No workout plan yet',
    noPlanBody: 'Get a weekly plan built around your goal, equipment and time.',
    createPlan: 'Make my workout plan',
    creatingPlan: 'Making your plan...',
    createError: "Couldn't make your workout plan. Please try again.",
  },

  water: {
    title: 'Water',
    unit: 'ml',
    of: (goal: string) => `of ${goal}`,
    add: (ml: number) => `+${ml} ml`,
    addAria: (ml: number) => `Add ${ml} ml of water`,
    error: "Couldn't add water. Please try again.",
    done: "You've hit your water goal today.",
  },

  left: {
    title: "What's left today",
    units: { kcal: 'kcal', grams: 'g' },
    calories: 'Calories',
    protein: 'Protein',
    unitLeft: (unit: string) => `${unit} left`,
    over: (n: number, unit: string) => `${Math.round(n)} ${unit} over`,
    done: 'Target reached',
    noTargets: 'Finish your profile to see daily targets.',
    eaten: (eaten: number, goal: number, unit: string) => `${Math.round(eaten)} of ${Math.round(goal)} ${unit}`,
  },

  recovery: {
    title: 'How are you feeling?',
    body: 'A 20-second check-in on sleep and soreness tunes today’s workout.',
    action: 'Check in',
    doneTitle: 'Checked in',
    doneBody: 'Today’s workout is tuned to how you feel.',
  },

  remindersCard: {
    title: 'Never miss a meal',
    body: 'Get a gentle nudge at your meal times, before your workout and for water.',
    action: 'Turn on reminders',
    working: 'Turning on...',
    dismiss: 'Maybe later',
  },

  install: {
    title: 'Add FitMind to your home screen',
    body: 'Opens like an app, and on iPhone it is needed for reminders.',
    action: 'Install',
    dismiss: 'Not now',
  },

  reminders: {
    title: 'Reminders',
    subtitle: 'Gentle nudges at your own meal times, in your timezone. Never more than one of each a day.',
    unavailable: "Reminders aren't available on this server yet.",
    unsupported: "This browser can't show reminders. On iPhone, add FitMind to your home screen first, then turn them on there.",
    blocked: 'Notifications are blocked for this site. Allow them in your browser settings, then try again.',
    deviceOn: 'Reminders are on for this device',
    deviceOff: 'Reminders are off for this device',
    turnOn: 'Turn on for this device',
    turnOff: 'Turn off for this device',
    test: 'Send a test',
    testSent: 'Test sent. It should arrive in a few seconds.',
    testNone: "Nothing was delivered. Try turning reminders off and on again.",
    on: 'Reminders are on',
    off: 'Reminders are off for this device',
    error: "Couldn't change reminders. Please try again.",
    saved: 'Saved',
    toggles: {
      meals: 'Meal times',
      mealsHint: 'At each meal time in your plan, unless you already logged it',
      workout: 'Workout',
      workoutHint: 'A little before you usually train, on workout days',
      water: 'Water',
      waterHint: "Once in the afternoon, if you're behind on water",
      comeback: 'Fresh start',
      comebackHint: 'One friendly note if you have been away for a couple of days',
    },
    workoutTime: 'Workout reminder time',
    workoutTimeAuto: 'Leave empty to use your usual workout time',
    waterTime: 'Water reminder time',
  },

  push: {
    defaultTitle: 'FitMind AI',
  },
} as const;
