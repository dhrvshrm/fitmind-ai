import type { BiomarkerCategory, BiomarkerStatus } from '../types/labReports';

const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const fmtNumber = (value: number) => (Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2))));

/** A range as people read it: "70 to 99", "under 5.7", "over 40". */
const fmtRange = (low: number | null, high: number | null, unit: string) => {
  const u = unit ? ` ${unit}` : '';
  if (low !== null && high !== null) return `${fmtNumber(low)} to ${fmtNumber(high)}${u}`;
  if (high !== null) return `up to ${fmtNumber(high)}${u}`;
  if (low !== null) return `${fmtNumber(low)}${u} or more`;
  return '';
};

export const LAB_REPORT_STRINGS = {
  fmtDate,
  fmtNumber,
  fmtRange,

  consent: {
    eyebrow: 'Optional',
    title: 'Before you upload a lab report',
    intro:
      'Upload a blood test and your AI coach can use real numbers like HbA1c, vitamin D or cholesterol to shape your meal plans and supplement suggestions. Skip it and everything else still works.',
    points: [
      {
        title: 'What we keep',
        body: 'The file you upload and only the values you check and save. Nothing is saved from a report until you confirm it.',
      },
      {
        title: 'Why',
        body: 'Only to shape your meal plans, supplement suggestions and coach replies. Never sold, never used for ads.',
      },
      {
        title: 'How',
        body: 'The file is stored privately and the values are encrypted. Only you can open them. AI reads a report only if you allow it for that upload.',
      },
      {
        title: 'Your call',
        body: 'Delete a report and its values any time. Withdraw consent and every report and value is deleted straight away.',
      },
    ],
    agree: 'I agree, continue',
    agreeing: 'Saving',
    agreed: 'Thanks. You can upload a report now.',
    error: "Couldn't save your consent. Please try again.",
  },

  privacy: {
    title: 'Your reports, your call',
    granted: (date: string) =>
      `You agreed on ${fmtDate(date)}. Files are stored privately and values are encrypted; only you can see them.`,
    withdraw: 'Withdraw and delete all',
    withdrawTitle: 'Delete every report?',
    withdrawBody:
      'Every report, file and saved value is deleted straight away, and your meal plans and coach stop using them. You can upload again later.',
    withdrawn: 'Done. Your reports and values have been deleted.',
    error: "Couldn't withdraw consent. Please try again.",
  },

  upload: {
    title: 'Upload a report',
    subtitle: 'A PDF or a clear photo of a blood test. You check every value before anything is saved.',
    pick: 'Choose a file',
    drop: 'or drop it here',
    types: 'PDF, JPG, PNG or WebP, up to 10 MB',
    whatTitle: 'What to upload',
    whatToggle: 'What can I upload?',
    whatBody:
      'A blood test report from any lab, like a full body checkup, lipid profile, thyroid profile or HbA1c test. The app reads these tests:',
    what: [
      { group: 'Blood sugar', tests: 'HbA1c, fasting and post-meal glucose' },
      { group: 'Cholesterol', tests: 'Total, LDL, HDL, triglycerides' },
      { group: 'Thyroid', tests: 'TSH, free T4' },
      { group: 'Vitamins', tests: 'Vitamin D, vitamin B12' },
      { group: 'Blood count and iron', tests: 'Haemoglobin, ferritin, serum iron' },
      { group: 'Kidney', tests: 'Creatinine, eGFR, urea (BUN), uric acid' },
      { group: 'Liver', tests: 'SGPT (ALT), SGOT (AST)' },
      { group: 'Minerals', tests: 'Calcium' },
    ],
    notThese:
      'Other blood tests on the same report are read by AI if you allow it. Scans, X-rays, ECGs and prescriptions can’t be read.',
    allowAi: 'Let AI read what the app misses',
    allowAiHelp:
      'The app reads common tests itself first. With this on, AI reads the rest of this report. Turn it off and you can type missing values yourself.',
    uploading: 'Reading your report',
    tooBig: 'That file is over 10 MB. Try a smaller PDF or a photo.',
    wrongType: 'Upload a PDF or a photo (JPG, PNG or WebP).',
    error: "Couldn't upload the report. Please try again.",
  },

  review: {
    close: 'Close',
    title: 'Check the values',
    subtitle:
      'Compare each value with your report. Change anything that was read wrong and remove what you don’t want saved.',
    reportDate: 'Date of the test',
    viewFile: 'Open the report',
    openError: "Couldn't open the file. Please try again.",
    value: 'Value',
    unit: 'Unit',
    range: (text: string, standard: boolean) => (text ? `${standard ? 'Usual range' : 'Lab range'}: ${text}` : ''),
    readByAi: 'Read by AI, check this one',
    unitUnchecked: 'Unit not recognised, check it',
    remove: (name: string) => `Remove ${name}`,
    restore: 'Undo',
    removed: (count: number) => (count === 1 ? '1 value removed' : `${count} values removed`),
    noneFound: 'No values could be read from this report.',
    noneFoundAi:
      'Try uploading it again with AI reading on, or add the values from the report by hand in Your test results.',
    aiFailed: 'AI couldn’t read this report right now, so only the values the app read itself are here.',
    save: (count: number) => (count === 1 ? 'Save 1 value' : `Save ${count} values`),
    saving: 'Saving',
    saved: (count: number) => (count === 1 ? '1 value saved.' : `${count} values saved.`),
    later: 'Check later',
    invalid: 'Fix the highlighted values first.',
    error: "Couldn't save the values. Please try again.",
  },

  list: {
    title: 'Your reports',
    empty: 'No reports yet',
    emptyBody: 'Upload one above. Values show up in your results once you check and save them.',
    needsReview: 'Needs checking',
    review: 'Check values',
    confirmed: (count: number) => (count === 1 ? '1 value saved' : `${count} values saved`),
    scanSaved: 'Scan saved',
    uploaded: (date: string) => `Uploaded ${fmtDate(date)}`,
    tested: (date: string) => `Test on ${fmtDate(date)}`,
    open: 'Open file',
    delete: 'Delete',
    deleteAria: (name: string) => `Delete ${name}`,
    deleteTitle: 'Delete this report?',
    deleteBody: 'The file and every value saved from it are deleted. This can’t be undone.',
    deleted: 'Report deleted.',
    loadError: "Couldn't load your reports.",
    error: "Couldn't delete the report. Please try again.",
    pdf: 'PDF',
    photo: 'Photo',
  },

  results: {
    title: 'Your test results',
    subtitle: 'Values you saved, newest first. Anything outside its range is shown first.',
    add: 'Add a value',
    empty: 'No results yet',
    emptyBody: 'Save values from a report, or add one from a past test by hand.',
    loadError: "Couldn't load your results.",
    latest: (date: string) => `Last tested ${fmtDate(date)}`,
    tests: (count: number) => (count === 1 ? '1 test' : `${count} tests`),
    history: 'Earlier results',
    deleteAria: (date: string) => `Delete the result from ${fmtDate(date)}`,
    deleted: 'Value deleted.',
    error: "Couldn't delete the value. Please try again.",
    source: (source: string) => `Range: ${source}`,
    usesNote:
      'Saved values shape your meal plans (for example less sugar when HbA1c is high), your supplement suggestions and your coach’s answers.',
    status: {
      low: 'Low',
      high: 'High',
      in_range: 'In range',
      unknown: 'No range',
    } satisfies Record<BiomarkerStatus, string>,
    categories: {
      blood_sugar: 'Blood sugar',
      lipids: 'Cholesterol',
      blood: 'Blood count',
      kidney: 'Kidney',
      liver: 'Liver',
      thyroid: 'Thyroid',
      vitamins: 'Vitamins',
      minerals: 'Minerals',
      other: 'Other',
    } satisfies Record<BiomarkerCategory, string>,
  },

  add: {
    title: 'Add a test result',
    subtitle: 'For a result from a past test that you don’t have as a file.',
    biomarker: 'Test',
    noOptions: 'No matching test',
    value: 'Value',
    date: 'Date of the test',
    usual: (text: string) => `Usual range: ${text}`,
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving',
    saved: 'Value saved.',
    required: 'Pick a test and enter its value.',
    error: "Couldn't save the value. Please try again.",
  },

  updatePrompt: {
    title: 'Use these results in your plans',
    blood:
      'Saved blood results can change your meal plan (for example less sugar when HbA1c is high). Your current plan was made before them. Workouts don’t change with blood results.',
    body_composition:
      'Your workout plan can now target what this scan shows, and your meal plan can use your new weight and body fat. Your current plans were made before it.',
    updateMeals: 'Update meal plan',
    updateWorkouts: 'Update workout plan',
    updated: 'Updated',
    mealsDone: 'Meal plan updated.',
    workoutsDone: 'Workout plan updated.',
    error: "Couldn't update the plan. Please try again.",
    dismiss: 'Not now',
    note: 'Plans never change on their own; you decide when.',
  },

  disclaimer:
    'Ranges are the usual adult ones, or the lab’s own when printed. A value outside a range is something to talk to your doctor about, not a diagnosis.',
};
