/**
 * Copy for the public landing page. It reads like one working day, written
 * for someone with a 9-to-6 job who still trains and eats home food. Every
 * claim describes something the app does today; sample numbers are marked.
 */
export const LANDING_STRINGS = {
  /** Marks sample content (the day's notes and numbers). */
  example: 'Example day',
  home: 'FitMind AI home',

  nav: {
    day: 'A day with your AI coach',
    promises: 'Promises',
    faq: 'Questions',
    login: 'Log in',
    start: 'Start free',
    menuAria: 'Open menu',
    closeAria: 'Close menu',
  },

  hero: {
    note: 'an AI coach for the 9-to-6 crowd who still lift',
    lines: ['Work all day.', 'Train anyway.'],
    lastLine: 'Eat ghar ka khana.',
    body:
      'FitMind is an AI fitness coach that plans your training and your plate as one. Say "dal chawal aur ek roti" and it logs the calories and protein. Finish a set and it tells you what to lift next time, and what to eat to recover. All of it built around office hours, not the other way round.',
    primary: 'Start free',
    secondary: 'Walk through a day',
    freeNote: 'Free while in early access. Two minutes to set up.',
    facts: [
      { value: 'AI', label: 'that understands your meals in Hinglish' },
      { value: '1 plan', label: 'for your workouts and your food, together' },
      { value: 'Real data', label: 'INDB food data and ACSM training rules behind every number' },
    ],
  },

  day: {
    eyebrow: 'A day with your AI coach',
    title: 'Your training and your food, planned as one normal Tuesday.',
    wake: {
      time: '6:45',
      period: 'am',
      title: 'Up before the alarm, mostly',
      caption: 'Your AI coach builds the day from your wake-up time: water and a light snack before you train, even on a night shift.',
      note: '400 ml paani before chai.',
      noteSub: 'pre-workout: 1 banana',
    },
    gym: {
      time: '7:30',
      period: 'am',
      title: 'Gym before office',
      caption: 'Log your sets and the AI tells you what to lift next time. The breakfast after is planned as your post-workout meal.',
      logTitle: 'Dumbbell press',
      logHead: ['Set', 'Last time', 'Today'],
      logRows: [
        ['1', '20 kg x 12', '22 kg x 8'],
        ['2', '20 kg x 12', '22 kg x 8'],
        ['3', '20 kg x 12', '22 kg x 7'],
      ],
      stamp: 'Add weight',
    },
    lunch: {
      time: '1:30',
      period: 'pm',
      title: 'Lunch at your desk',
      caption: 'Type it in Hinglish. The AI reads it, real food data does the maths, and you see how much protein your training still needs today.',
      message: 'dal chawal aur ek roti, raita bhi',
      receiptTitle: 'Lunch, logged',
      receiptRows: [
        ['Dal tadka, 1 bowl', '188 kcal'],
        ['Steamed rice, 1 bowl', '210 kcal'],
        ['Chapati, 1', '120 kcal'],
        ['Cucumber raita, 1 bowl', '84 kcal'],
      ],
      receiptTotal: ['Total', '602 kcal'],
      receiptProtein: 'Protein left today: 62 g',
    },
    desk: {
      time: '4:00',
      period: 'pm',
      title: 'Stuck in back-to-back meetings',
      caption: 'Two-minute routines for the neck, back, hips and wrists, so long desk hours do not undo the morning workout.',
      card: 'Neck and upper back reset',
      cardMeta: '2 minutes, no equipment',
      steps: ['Chin tucks', 'Shoulder rolls', 'Seated twist'],
    },
    evening: {
      time: '8:30',
      period: 'pm',
      title: 'Dinner, whatever the week looks like',
      caption: 'Fasting, festivals and shifts change your meals and your workout timing together, so neither plan falls apart.',
      tags: ['Navratri mode', 'Jain', 'Night shift', 'Ramadan timings', 'Ekadashi'],
      plan: 'tonight: rajgira roti, aloo sabzi, curd',
    },
    night: {
      time: '10:30',
      period: 'pm',
      title: 'Wind down, see the week',
      caption: 'Weight, waist and strength trends side by side, and calorie targets that adjust to how your body actually responded.',
      postcardTitle: '4 weeks in',
      postcardLines: ['Waist: 1.5 cm down', 'Dumbbell press: 18 to 22 kg', '5 of 6 workouts, most weeks'],
    },
  },

  promises: {
    eyebrow: 'Promises',
    title: 'What we will not do.',
    items: [
      'Let the AI guess your numbers. It picks foods and exercises; calories, sets and reps come from real data and guidelines.',
      'Hide an estimate. If something is approximate, it says so.',
      'Change your plan behind your back. New targets and level-ups wait for your OK.',
      'Sell your data. Health details are encrypted and deleted with your account.',
      'Pretend to be your doctor. For medical conditions, talk to one.',
    ],
    signature: 'the FitMind team',
  },

  faq: {
    eyebrow: 'Questions',
    title: 'Before you start',
    items: [
      { q: 'Is it free?', a: 'Yes, while FitMind is in early access. No card needed.' },
      {
        q: 'Where does the AI come in?',
        a: 'It reads your meals in plain English or Hinglish, picks dishes and exercises for your plans, and powers the coach you can chat with. The numbers come from food databases and training guidelines, never from a guess.',
      },
      {
        q: 'I only have dumbbells at home.',
        a: 'Workouts are built from what you have, from nothing at all to a full gym, and any exercise can be swapped.',
      },
      {
        q: 'I am vegetarian, Jain, or fasting this week.',
        a: 'Plans follow veg, eggetarian, non-veg and Jain diets, your allergies and dislikes, plus modes for Navratri, Ekadashi, Paryushan and Ramadan.',
      },
      {
        q: 'Do I have to weigh every gram?',
        a: 'No. Describe the meal in your own words and adjust portions only if you want to.',
      },
      {
        q: 'Will it work on my phone?',
        a: 'Yes. It runs in any browser and installs to your home screen like an app, with reminders.',
      },
      {
        q: 'Why food and training in one app?',
        a: 'Because one without the other stalls. Your meal plan knows when you train, and your workouts know how you are eating and recovering.',
      },
    ],
  },

  closing: {
    line: 'Tomorrow is a workday. Your AI coach has already planned the workout and the meals.',
    note: 'see you at 7:30 am',
    primary: 'Start free',
    secondary: 'I already have an account',
  },

  // Login and signup pages share the landing page's look.
  auth: {
    backHome: 'Back to home',
    note: 'today: 22 kg x 8, protein 132 g',
  },

  footer: {
    tagline: 'An AI coach for training and nutrition, built for how India eats, trains and works.',
    rights: (year: number) => `${year} FitMind AI`,
    disclaimer: 'FitMind gives general fitness and nutrition guidance, not medical advice.',
  },
} as const;
