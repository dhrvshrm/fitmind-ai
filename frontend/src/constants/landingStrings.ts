/**
 * Copy for the public landing page. It reads like one working day, written
 * for someone with a 9-to-6 job who still trains and eats home food. Every
 * claim describes something the app does today; sample numbers are marked.
 */
export const LANDING_STRINGS = {
  /** Marks sample content (the day's notes and numbers). */
  example: 'Example day',
  home: 'RepEat AI home',

  nav: {
    day: 'A day with your AI coach',
    pg: 'PG & hostel',
    supplements: 'Supplements',
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
      'RepEat is an AI fitness coach that plans your training and your plate as one. Say "dal chawal aur ek roti" and it logs the calories and protein. Finish a set and it tells you what to lift next time, and what to eat to recover. All of it built around office hours, or a college day and a PG mess, not the other way round.',
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
      caption: 'Your AI coach builds the day from your wake-up time: water and a light snack before you train, even on a night shift. On rest days the snack and the workout drop out, and the day is just your meals.',
      note: '400 ml paani before chai.',
      noteSub: 'pre-workout: 1 banana',
    },
    gym: {
      time: '7:30',
      period: 'am',
      title: 'Gym before office',
      caption: 'Every session opens with a warm-up for the muscles you train that day: easy cardio, mobility, then lighter ramp-up sets. Log your sets and the AI tells you what to lift next time. The breakfast after is planned as your post-workout meal.',
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
      caption: 'Type it in Hinglish. The AI reads it, real food data does the maths, and the rest of today’s meal plan resizes around what you actually ate.',
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

  pg: {
    eyebrow: 'Living in a PG or hostel?',
    title: 'Mess ka khana.',
    titleAccent: 'Poora protein.',
    body:
      'Nobody knows what the mess will cook tomorrow, but there is always chapati and some sabzi or dal. Tell RepEat which meals your mess serves and what you keep on your shelf. Your AI coach plans around the mess thali, tells you how many roti to take, and uses every food on your shelf somewhere in the day, priced to the rupee.',
    points: [
      'The mess meal is planned as chapati with whatever sabzi or dal is made. Log what was actually served in Hinglish and the rest of the day adjusts.',
      'Before training, between classes and before bed: only foods from your shelf, and every one of them gets used.',
      'Short on protein? It names the cheapest fix, like roasted chana at about ₹5 a bowl.',
      'Your shopping list has only the shelf, never the mess’s rice and atta.',
    ],
    cta: 'Set it up in onboarding',
    chitTitle: 'Today, mess + shelf',
    chitRows: [
      ['5:40', 'Shelf: dates, banana, coffee', '₹20'],
      ['7:15', 'Mess: nashta, chai + bread, PB', '₹20'],
      ['1:30', 'Mess: 6 roti + sabzi or dal', ''],
      ['5:00', 'Shelf: chana, peanuts, milk', '₹19'],
      ['8:30', 'Mess: 6 roti + sabzi or dal', ''],
      ['10:00', 'Shelf: milk, roasted chana', '₹15'],
    ],
    chitTotal: ['Extras today', '₹74'],
    chitProtein: '99 g protein · volleyball day',
    chitNote: 'no cooking needed',
  },

  supplements: {
    eyebrow: 'Whey? Creatine? Nothing?',
    title: 'Supplements.',
    titleAccent: 'Only what you need.',
    body:
      'Tell RepEat what you can spend a month and it suggests the bare minimum for your body, your diet and your training, food first, with no brands and nothing to sell. Track what you take and your meal plan makes room for it, at the best time for your day.',
    points: [
      'A few picks within your budget, each with the reason and why Indian diets often fall short of it. Protein powder only if your logged meals really miss your target.',
      'Type the product you bought and the AI fills in the dose and macros for you.',
      'A scoop of whey goes into your post-workout meal and the food around it shrinks. Creatine and vitamins show up with the meal you take them with.',
      'Tick it off once and the plan and reminders know it is done.',
      'Steroids, hormones, SARMs, fat burners and weight-loss drugs are never listed or tracked.',
    ],
    cta: 'Set my budget',
    boxTitle: 'Today, budget ₹5,000 a month',
    budgets: ['Food only', '₹1,000', '₹2,500', '₹5,000'],
    budgetPicked: '₹5,000',
    // [time, when, what, 'done' once ticked]
    slots: [
      ['08:15', 'Breakfast, after training', 'Whey 1 scoop + creatine 5 g', 'done'],
      ['13:30', 'Lunch', 'Vitamin D3, 1000 IU', ''],
    ],
    total: ['Spent a month', 'about ₹2,870'],
    never: 'No brands. No steroids or fat burners.',
    note: 'one step, not three',
  },

  promises: {
    eyebrow: 'Promises',
    title: 'What we will not do.',
    items: [
      'Let the AI guess your numbers. It picks foods and exercises; calories, sets and reps come from real data and guidelines.',
      'Hide an estimate. If something is approximate, it says so.',
      'Change your plan behind your back. New targets and level-ups wait for your OK.',
      'Sell your data. Health details are encrypted and deleted with your account.',
      'Push supplements on you. No brands, no paid picks, and food comes first.',
      'Pretend to be your doctor. For medical conditions, talk to one.',
      'Save a lab value you have not checked. AI can read a report, but only you confirm what is kept.',
    ],
    signature: 'the RepEat team',
  },

  faq: {
    eyebrow: 'Questions',
    title: 'Before you start',
    items: [
      { q: 'Is it free?', a: 'Yes, while RepEat is in early access. No card needed.' },
      {
        q: 'How do I know the calories are right?',
        a: 'Every food shows where its numbers came from. Most come from food databases, and everyday street food like samosa, kachori, pani puri and vada pav is built from standard piece weights. Only a food we do not know gets an AI estimate, and that one shows a likely range. If it looks much higher than a similar food in our database, or the portion is bigger than usual, the app asks you to check it before you save. A plate of rajma chawal counts as one plate, not a plate of each, and the meal is saved with a short name like Poha and chai.',
      },
      {
        q: 'Where does the AI come in?',
        a: 'It reads your meals in plain English or Hinglish, picks dishes and exercises for your plans, and powers the coach you can chat with. The numbers come from food databases and training guidelines, never from a guess.',
      },
      {
        q: 'I only have dumbbells at home.',
        a: 'Workouts are built from what you have, from nothing at all to a full gym, and any exercise can be swapped.',
      },
      {
        q: 'Which exercises will I get?',
        a: 'The best-proven ones you can do. Every exercise is ranked for its muscle, and plans always pick the top one that fits your equipment, level and injuries: hack squats, incline curls and overhead triceps extensions at the gym; Bulgarian split squats and incline rows with dumbbells; pike push-ups and backpack squats at home. Beginners and advanced lifters both get top picks, matched to their level.',
      },
      {
        q: 'I am vegetarian, Jain, or fasting this week.',
        a: 'Plans follow veg, eggetarian, non-veg and Jain diets, your allergies and dislikes, plus modes for Navratri, Ekadashi, Paryushan and Ramadan.',
      },
      {
        q: 'I live in a PG and eat mess food.',
        a: 'Turn on mess mode. The plan counts on chapati with whatever sabzi or dal the mess makes, and uses every no-cook food on your shelf (milk, eggs, roasted chana, peanuts, bread and peanut butter) somewhere in the day, with what they cost.',
      },
      {
        q: 'Do I need whey or creatine?',
        a: 'Maybe not. Set a monthly budget (or food only) and RepEat suggests the bare minimum for your diet and training, with no brands. Whatever you do take is placed in your meal plan at the best time for your day.',
      },
      {
        q: 'I have diabetes, thyroid or high BP.',
        a: 'Add it to your health profile, only if you want to. Meal plans adjust (less sugar or salt, for example) and your AI coach keeps it in mind. You only see the options that apply to you, so pregnancy or PCOS never show up for men. It is never a diagnosis, and it is encrypted and yours to delete.',
      },
      {
        q: 'My gym did a body composition scan (InBody). Can I use it?',
        a: 'Yes. Upload the printout or a photo of it. RepEat reads your weight, muscle, body fat, visceral fat and the muscle in each arm, leg and your trunk, and you check every number. If one side or one area lags, your workout plan adds exercises for exactly that, right after the main lifts, never cut for time; a weaker arm or leg is trained one side at a time. Your calorie targets then use your lean mass too, and if the scan and your goal pull apart (building muscle with high body fat, say), RepEat suggests a better-suited goal. You decide.',
      },
      {
        q: 'Can I upload my blood test report?',
        a: 'Yes. Upload a PDF or a photo of a blood test from any lab: a full body checkup, lipid profile, thyroid profile, HbA1c, vitamin D or B12. RepEat reads values like HbA1c, cholesterol, TSH, haemoglobin and vitamin D, and you check every one before it is saved. Saved results shape your meal plan and supplement suggestions, and you can see them over time. Files are private and you can delete them any time.',
      },
      {
        q: 'Will my plan suit where I live and the season?',
        a: 'If you want it to. Switch on seasonal eating and add your city or state, and the plan picks fruits and vegetables in season there. Left off, plans use everyday foods found almost anywhere. In a Kashmir winter that means haak, nadru, shalgam and gajar, not bhindi or lauki; a Delhi summer brings lauki, torai and mango. Dal, rice, roti, potato, onion and tomato stay on all year. Each season also gets simple habits, like more water and chaach in summer and warm dals and soups in winter. If you follow taseer (thanda and garam foods), switch it on and winter plans skip cooling foods like cucumber and chaas.',
      },
      {
        q: 'Can I have a cheat meal?',
        a: 'Yes, a healthier one. Pick what you are craving, from something sweet or a cake to pizza, a burger, tikka or street food, and RepEat shows lighter versions you can make or order: a chocolate protein mug cake, a grilled chicken burger, a paneer roti pizza, shakarkandi chaat. Every option fits your diet, allergies and health profile, and once you log it the rest of the day makes room. Two a week is the suggestion, never a rule.',
      },
      {
        q: 'What if I eat something that is not in the plan?',
        a: 'Log it. That meal shows what you really had, and the meals still to come shrink or grow so the day still lands near your target. Every dish also says how much oil or ghee its calories assume.',
      },
      {
        q: 'What about warm-ups and rest days?',
        a: 'Each training day starts with a warm-up in three phases, matched to that day: a few easy minutes on a bike or treadmill (or marching at home), mobility for the joints you are about to load, then lighter sets of your first lift. On rest days your meal plan drops the pre-workout snack and the workout, so you only see your meals.',
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
    rights: (year: number) => `${year} RepEat AI`,
    disclaimer: 'RepEat gives general fitness and nutrition guidance, not medical advice.',
  },
} as const;
