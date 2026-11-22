import type { BodyScanFieldKey, ScanFinding, SegmentKey, SegmentStatus } from '../types/bodyScan';

const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const SIDE = { left: 'left', right: 'right' } as const;

/** Copy for body composition scans (InBody and similar) and the training built around them. */
export const BODY_SCAN_STRINGS = {
  fmtDate,

  kinds: {
    label: 'What are you uploading?',
    blood: 'Blood test',
    body_composition: 'Body composition scan',
  },

  upload: {
    subtitle:
      'The printout from a body composition machine at your gym or clinic (InBody, Tanita, Karada Scan and similar). A PDF or a clear photo of the sheet. You check every value before anything is saved.',
    whatTitle: 'What gets read',
    whatBody:
      'Weight, skeletal muscle mass, body fat, visceral fat and BMR, plus the segmental analysis: muscle in each arm, the trunk and each leg. That last part is what lets your plan target a weaker arm or leg.',
    aiNeeded: 'Photos of the sheet are read by AI, so keep "Let AI read" on, or type the values in yourself.',
  },

  fields: {
    measured_at: 'Date of the scan',
    device: 'Machine',
    weight_kg: 'Weight',
    skeletal_muscle_mass_kg: 'Skeletal muscle mass',
    body_fat_mass_kg: 'Body fat mass',
    body_fat_percent: 'Body fat',
    fat_free_mass_kg: 'Fat-free mass',
    total_body_water_l: 'Total body water',
    protein_kg: 'Protein',
    minerals_kg: 'Minerals',
    visceral_fat_level: 'Visceral fat level',
    bmr_kcal: 'Basal metabolic rate',
    score: 'Scan score',
  } satisfies Record<BodyScanFieldKey | 'measured_at' | 'device', string>,
  units: {
    weight_kg: 'kg',
    skeletal_muscle_mass_kg: 'kg',
    body_fat_mass_kg: 'kg',
    body_fat_percent: '%',
    fat_free_mass_kg: 'kg',
    total_body_water_l: 'L',
    protein_kg: 'kg',
    minerals_kg: 'kg',
    visceral_fat_level: '',
    bmr_kcal: 'kcal',
    score: '',
  } satisfies Record<BodyScanFieldKey, string>,
  segments: {
    right_arm: 'Right arm',
    left_arm: 'Left arm',
    trunk: 'Trunk',
    right_leg: 'Right leg',
    left_leg: 'Left leg',
  } satisfies Record<SegmentKey, string>,

  form: {
    main: 'Main results',
    segmentTitle: 'Muscle by body part (segmental lean analysis)',
    segmentHelp:
      'Copy the lean mass of each part and its % of standard (the number next to the bar). Leave blank what the sheet doesn’t show.',
    leanKg: 'Lean kg',
    leanPercent: '% of standard',
    useForProfile: 'Update my weight and body fat in my profile',
    useForProfileHelp:
      'Your calorie targets are then worked out from your lean mass, which is more accurate than weight alone. Weight is only updated from a scan in the last two weeks.',
    readByAi: 'Read by AI: compare with the sheet before saving.',
    readLocal:
      'Read from the printout. Body part numbers usually need AI or typing in: copy them from the segmental analysis.',
    aiFailed: 'AI couldn’t read this sheet right now. Type the values from it below.',
    nothingRead: 'Nothing could be read from this file. Type the values from the sheet below.',
    invalid: 'Some values look wrong. Check the highlighted fields.',
    empty: 'Add at least your weight, muscle mass, body fat or one body part.',
    save: 'Save scan',
    saving: 'Saving',
    saved: 'Scan saved.',
    savedProfile: 'Scan saved. Your profile and targets now use it.',
    later: 'Check later',
    cancel: 'Cancel',
    close: 'Close',
    error: "Couldn't save the scan. Please try again.",
    addTitle: 'Add a scan by hand',
    addSubtitle: 'Copy the numbers from your printout.',
    reviewTitle: 'Check the scan',
    reviewSubtitle: 'Compare each number with your printout and fix anything read wrong.',
    openFile: 'Open the printout',
    openError: "Couldn't open the file. Please try again.",
  },

  card: {
    title: 'Your body composition',
    subtitle: 'From your latest scan. Your workout plan trains around it.',
    add: 'Add a scan',
    empty: 'No scans yet',
    emptyBody:
      'Upload the printout from a body composition machine (InBody and similar) above, or type it in. Your plan then targets any part that lags behind.',
    loadError: "Couldn't load your scans.",
    scanned: (date: string, device?: string | null) => `Scanned ${fmtDate(date)}${device ? ` on ${device}` : ''}`,
    sinceLast: 'Since your last scan',
    findingsTitle: 'What it means for your training',
    bodyMapTitle: 'Muscle by body part',
    bodyMapAria: 'Body diagram with each part coloured by its muscle compared with the standard',
    scaleCaption: 'Muscle compared with the standard for your height and weight',
    bandLegend: 'Standard range (90 to 110%); the line marks 100%',
    facingNote: 'Shown facing you, like your printout: your right side is on the left.',
    percentOfStandard: (pct: number) => `${Math.round(pct)}% of standard`,
    makePlan: 'Make a workout plan around it',
    planHint: 'Your current plan was made before this scan.',
    history: 'Earlier scans',
    delete: 'Delete scan',
    deleteAria: (date: string) => `Delete the scan from ${fmtDate(date)}`,
    deleted: 'Scan deleted.',
    deleteError: "Couldn't delete the scan. Please try again.",
    disclaimer:
      'Body composition machines estimate; readings move with water, food and time of day. Compare scans taken the same way, ideally in the morning before eating.',
  },

  /** When the scan and the chosen goal pull apart. The person decides; the plan follows their goal. */
  goalAdvice: {
    title: (goal: string) => `Your scan suggests ${goal} may suit you better`,
    reason: {
      surplus_with_high_fat:
        'Your body fat is on the high side, and building muscle means eating above maintenance, so some of that surplus is stored as more fat. Recomposition keeps a small deficit and high protein with the same muscle-building workouts: you build muscle while the fat comes down.',
      deficit_when_very_lean:
        'Your body fat is already very low. Eating below maintenance from here mostly costs muscle, energy and recovery. Building muscle on a small surplus fits your body better right now.',
    } as Record<string, string>,
    keep: 'Your plan keeps following your current goal until you change it.',
    switch: (goal: string) => `Switch to ${goal}`,
    switching: 'Switching',
    dismiss: 'Keep my goal',
    switched: 'Goal changed. Your targets are updated; make a new meal and workout plan so they follow it.',
    error: "Couldn't change your goal. Please try again.",
  },

  status: {
    under: 'Below standard',
    normal: 'Standard',
    over: 'Above standard',
  } satisfies Record<SegmentStatus, string>,

  /** One line per finding, with the numbers behind it. */
  finding: (f: ScanFinding): string => {
    const v = f.values;
    switch (f.code) {
      case 'body_fat_essential':
        return `Body fat ${v.percent}% is very low. Eat enough to keep training and recovering well.`;
      case 'body_fat_athletic':
        return `Body fat ${v.percent}% is in the athletic range.`;
      case 'body_fat_fitness':
        return `Body fat ${v.percent}% is in the fitness range.`;
      case 'body_fat_average':
        return `Body fat ${v.percent}% is in the average range.`;
      case 'body_fat_high':
        return `Body fat ${v.percent}% is above the healthy range. Each strength day ends with easy conditioning, and steady fat loss is the aim.`;
      case 'visceral_high':
        return `Visceral fat level ${v.level} is high (10 or more). Regular cardio and a small calorie deficit bring it down; talk to your doctor if you have other risk factors.`;
      case 'arm_imbalance':
        return `Your ${SIDE[v.side as 'left' | 'right']} arm has ${v.gap_percent}% less muscle than the other. Arm work is single-arm, starting with the ${v.side} side, and the stronger side matches its reps.`;
      case 'leg_imbalance':
        return `Your ${SIDE[v.side as 'left' | 'right']} leg has ${v.gap_percent}% less muscle than the other. Leg work is single-leg, starting with the ${v.side} side, and the stronger side matches its reps.`;
      case 'arms_lagging':
        return 'Your arms are behind the rest of you. Biceps and triceps get dedicated exercises right after the main lifts, with an extra set.';
      case 'legs_lagging':
        return 'Your legs are behind the rest of you. Lower body days add dedicated quad and single-leg work right after the main lifts, with an extra set.';
      case 'trunk_lagging':
        return 'Your trunk (back and core) is behind. Upper days add a dedicated row and core work.';
      case 'balanced':
        return 'Muscle is balanced across your body. Your plan stays as it is.';
      default:
        return '';
    }
  },

  changes: {
    weight_kg: 'Weight',
    skeletal_muscle_mass_kg: 'Muscle',
    body_fat_mass_kg: 'Fat mass',
    body_fat_percent: 'Body fat',
    visceral_fat_level: 'Visceral fat',
  } as Record<string, string>,

  /** Workout page: what the plan does with the scan. */
  workout: {
    focusChip: { arms: 'Focus: arms', legs: 'Focus: legs', trunk: 'Focus: back and core' } as Record<string, string>,
    weakerFirst: (side: string) => `${side === 'left' ? 'Left' : 'Right'} side first`,
    focusTooltip: (side?: string) =>
      side
        ? `Your body scan shows this side has less muscle. Do all its reps first, then match them with the other side. An extra set is added.`
        : 'Your body scan shows this area lags behind, so it comes right after the main lifts with an extra set.',
    finisherTitle: (minutes: number) => `Finish with ${minutes} min easy conditioning`,
    finisherGym: 'Incline treadmill walk or stationary bike at a pace where you can still talk.',
    finisherHome: 'Brisk walk outside or marching on the spot at a pace where you can still talk.',
    scanChanged: 'You saved a new body scan after this plan was made. Make a new plan so it trains around it.',
  },
};
