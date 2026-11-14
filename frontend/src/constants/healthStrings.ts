/**
 * Copy for the Health page: consent and the health profile. Plain, calm and
 * never diagnostic.
 */
import type { ConditionKey, PlanEffect } from '../types/health';

const fmtDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const HEALTH_STRINGS = {
  nav: 'Health',
  page: {
    title: 'Health',
    subtitle: 'Conditions and medicines your AI coach should know, so your meal plans and advice stay safe.',
    disclaimer:
      'FitMind gives general wellness information, not medical advice. It never diagnoses or prescribes. Please talk to your doctor about your health.',
    loadError: "Couldn't load your health profile. Check your connection and try again.",
  },
  common: {
    yes: 'Yes',
    no: 'No',
    selfReported: 'You told us',
    fromReport: 'From a lab report',
    recordedOn: (date: string) => `on ${fmtDate(date)}`,
  },
  consent: {
    eyebrow: 'Optional',
    title: 'Before you share health details',
    intro:
      'Tell us about conditions and medicines and your AI coach adjusts your meal plans and answers around them. Skip it and everything else still works.',
    points: [
      {
        title: 'What we keep',
        body: 'The conditions you tick, your answers to a few follow-up questions, any medicines you list, and the date you told us.',
      },
      {
        title: 'Why',
        body: 'Only to shape your meal plans and coach replies. Never sold, never used for ads.',
      },
      {
        title: 'How',
        body: 'Encrypted on our servers. Only you can see it.',
      },
      {
        title: 'Your call',
        body: 'Change it any time. Withdraw consent and it is deleted straight away, and deleting your account deletes it too.',
      },
    ],
    agree: 'I agree, continue',
    agreeing: 'Saving',
    agreed: 'Thanks. You can change your mind any time.',
    error: "Couldn't save your consent. Please try again.",
  },
  privacy: {
    title: 'Your privacy',
    granted: (date: string) => `You agreed on ${fmtDate(date)}. Your answers are encrypted and only you can see them.`,
    withdraw: 'Withdraw and delete',
    withdrawTitle: 'Withdraw consent?',
    withdrawBody:
      'Your health profile is deleted straight away, and your meal plans and coach stop using it. You can add it again later.',
    withdrawn: 'Done. Your health profile has been deleted.',
    error: "Couldn't withdraw consent. Please try again.",
  },
  profile: {
    title: 'Health conditions',
    subtitle: 'Tick anything that applies and leave the rest. Unticked means unknown, not healthy.',
    conditions: {
      diabetes: 'Diabetes or prediabetes',
      pcos: 'PCOS',
      thyroid: 'Thyroid condition',
      hypertension: 'High blood pressure',
      high_cholesterol: 'High cholesterol',
      kidney: 'Kidney condition',
      pregnancy: 'Pregnant or breastfeeding',
      digestive: 'Digestive issues',
    } satisfies Record<ConditionKey, string>,
    questions: {
      type: 'Which type?',
      on_medication: 'Do you take medicine for it?',
      uses_insulin: 'Do you use insulin?',
      under_care: 'Are you seeing a doctor for it?',
      on_dialysis: 'Are you on dialysis?',
      status: 'Which applies?',
      trimester: 'Which trimester?',
    } as Record<string, string>,
    options: {
      type1: 'Type 1',
      type2: 'Type 2',
      prediabetes: 'Prediabetes',
      gestational: 'Gestational',
      unsure: 'Not sure',
      hypothyroid: 'Underactive (hypothyroid)',
      hyperthyroid: 'Overactive (hyperthyroid)',
      ckd: 'Chronic kidney disease',
      kidney_stones: 'Kidney stones',
      other: 'Other',
      pregnant: 'Pregnant',
      breastfeeding: 'Breastfeeding',
      first: 'First',
      second: 'Second',
      third: 'Third',
      ibs: 'IBS',
      acid_reflux: 'Acid reflux',
      ibd: 'IBD (Crohn’s or colitis)',
    } as Record<string, string>,
    conditionsAria: 'Health conditions',
    medicinesTitle: 'Medicines and anything else',
    otherLabel: 'Other conditions',
    otherHelp: 'Optional. For example: migraine, asthma.',
    medicationsLabel: 'Medicines you take now',
    medicationsHelp: 'Optional. Names and doses help your coach flag supplement clashes.',
    bloodThinners: 'Do you take a blood thinner (like warfarin, apixaban or clopidogrel)?',
    allergiesNote: 'Food allergies and intolerances live in your food preferences.',
    allergiesLink: 'Edit food preferences',
    save: 'Save health profile',
    saving: 'Saving',
    saved: 'Health profile saved. Your next meal plan will use it.',
    unsaved: 'Unsaved changes',
    error: "Couldn't save your health profile. Please try again.",
  },
  effects: {
    title: 'What changes in your plans',
    subtitle: 'Your AI coach also sees these answers when you chat.',
    items: {
      blood_sugar: 'Meal plans leave out refined grains, added sugar and sweet drinks.',
      blood_pressure: 'Meal plans remind you to keep salt low.',
      cholesterol: 'Meal plans favour less fried food and saturated fat.',
      kidney: 'Protein targets stay moderate, and plans suggest agreeing protein with your doctor.',
      pregnancy: 'No calorie deficit, and plans suggest going over them with your doctor.',
    } satisfies Record<PlanEffect, string>,
    none: 'Nothing you have saved changes your meal plans right now.',
  },
  /** The meal plan note listing what the health profile changed. */
  planNote: (effects: string[]) => `Shaped by your health profile. ${effects.join(' ')}`,
};
