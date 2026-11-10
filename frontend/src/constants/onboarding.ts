import {
  AccessibilityNewRounded,
  AutorenewRounded,
  BalanceRounded,
  BoltRounded,
  ChairRounded,
  DirectionsBikeRounded,
  DirectionsRunRounded,
  DirectionsWalkRounded,
  FavoriteRounded,
  FemaleRounded,
  FitnessCenterRounded,
  HikingRounded,
  LocalFireDepartmentRounded,
  MaleRounded,
  MilitaryTechRounded,
  SelfImprovementRounded,
  SportsGymnasticsRounded,
  SportsMartialArtsRounded,
  StadiumRounded,
  TransgenderRounded,
  WavesRounded,
  WeekendRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";
import type { SvgIconProps } from "@mui/material";
import type { ComponentType } from "react";
import type {
  ActivityLevel,
  Cook,
  DietType,
  EatOutFrequency,
  ExperienceLevel,
  FitnessGoal,
  Gender,
  GoalPace,
  OnboardingData,
  ReproductiveStatus,
  WorkSchedule,
  WorkoutTime,
} from "../types/onboarding";

/** A selectable option rendered as a card, with a Material icon. */
export type Option<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  icon: ComponentType<SvgIconProps>;
};

/** A compact option rendered as a chip. */
export type ChipOption<T extends string | number | boolean = string> = {
  value: T;
  label: string;
};

export const GENDER_OPTIONS: Option<Gender>[] = [
  { value: "male", label: "Male", icon: MaleRounded },
  { value: "female", label: "Female", icon: FemaleRounded },
  { value: "other", label: "Other", icon: TransgenderRounded },
];

export const REPRODUCTIVE_OPTIONS: ChipOption<ReproductiveStatus>[] = [
  { value: "none", label: "Neither" },
  { value: "pregnant", label: "Pregnant" },
  { value: "breastfeeding", label: "Breastfeeding" },
  { value: "unknown", label: "Prefer not to say" },
];

export const GOAL_OPTIONS: Option<FitnessGoal>[] = [
  {
    value: "fat_loss",
    label: "Lose fat",
    description: "Get leaner with a steady calorie deficit and enough protein to keep muscle.",
    icon: LocalFireDepartmentRounded,
  },
  {
    value: "muscle_gain",
    label: "Build muscle",
    description: "Gain size and strength with a small surplus and progressive training.",
    icon: FitnessCenterRounded,
  },
  {
    value: "recomposition",
    label: "Recomposition",
    description: "Lose fat and build muscle together, slowly, at around maintenance.",
    icon: AutorenewRounded,
  },
  {
    value: "maintain",
    label: "Maintain weight",
    description: "Stay where you are and eat for energy and health.",
    icon: BalanceRounded,
  },
  {
    value: "general_fitness",
    label: "General fitness",
    description: "Feel better, move more and build healthy habits.",
    icon: FavoriteRounded,
  },
  {
    value: "athletic_performance",
    label: "Athletic performance",
    description: "Fuel training for a sport, running or endurance events.",
    icon: DirectionsRunRounded,
  },
];

/** Goals where how fast to go matters. */
export const GOALS_WITH_PACE: FitnessGoal[] = ["fat_loss", "muscle_gain"];

export const PACE_OPTIONS: Record<"fat_loss" | "muscle_gain", ChipOption<GoalPace>[]> = {
  fat_loss: [
    { value: "gentle", label: "Gentle (about 0.25 kg a week)" },
    { value: "moderate", label: "Steady (about 0.5 kg a week)" },
    { value: "aggressive", label: "Faster (up to 0.75 kg a week)" },
  ],
  muscle_gain: [
    { value: "gentle", label: "Lean (minimal fat gain)" },
    { value: "moderate", label: "Steady" },
    { value: "aggressive", label: "Faster (more fat gain)" },
  ],
};

export const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  {
    value: "sedentary",
    label: "Mostly sitting",
    description: "Desk job or studying, little walking, not counting workouts.",
    icon: ChairRounded,
  },
  {
    value: "light",
    label: "Lightly active",
    description: "Some walking or standing during the day, or light exercise 1 to 3 days a week.",
    icon: DirectionsWalkRounded,
  },
  {
    value: "moderate",
    label: "Moderately active",
    description: "On your feet a fair bit, or exercise 3 to 5 days a week.",
    icon: HikingRounded,
  },
  {
    value: "active",
    label: "Very active",
    description: "Physical job, or hard training 6 to 7 days a week.",
    icon: DirectionsBikeRounded,
  },
  {
    value: "very_active",
    label: "Extremely active",
    description: "Heavy manual work plus training, or training twice a day.",
    icon: BoltRounded,
  },
];

export const WORKOUT_DAYS_OPTIONS: ChipOption<number>[] = [0, 1, 2, 3, 4, 5, 6, 7].map((d) => ({
  value: d,
  label: String(d),
}));

export const WORKOUT_TIME_OPTIONS: ChipOption<WorkoutTime>[] = [
  { value: "early_morning", label: "Early morning" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
  { value: "varies", label: "It varies" },
];

export const EXPERIENCE_OPTIONS: Option<ExperienceLevel>[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "New to training or returning after a long break.",
    icon: SelfImprovementRounded,
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Training consistently for 6+ months and comfortable with the basics.",
    icon: BoltRounded,
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Years of structured training and strong technique.",
    icon: WorkspacePremiumRounded,
  },
  {
    value: "Ultra-advanced",
    label: "Competitive",
    description: "Competing or training at an elite level.",
    icon: MilitaryTechRounded,
  },
];

/** Multi-select equipment. Values are sent as-is in `available_equipment`. */
export const EQUIPMENT_OPTIONS: Option[] = [
  { value: "bodyweight", label: "Bodyweight only", icon: AccessibilityNewRounded },
  { value: "dumbbells", label: "Dumbbells", icon: FitnessCenterRounded },
  { value: "barbell", label: "Barbell", icon: SportsGymnasticsRounded },
  { value: "kettlebell", label: "Kettlebell", icon: SportsMartialArtsRounded },
  { value: "resistance_bands", label: "Resistance bands", icon: WavesRounded },
  { value: "pull_up_bar", label: "Pull-up bar", icon: FitnessCenterRounded },
  { value: "bench", label: "Bench", icon: WeekendRounded },
  { value: "cardio_machine", label: "Cardio machine", icon: DirectionsBikeRounded },
  { value: "full_gym", label: "Full gym", icon: StadiumRounded },
];

/** Free-text friendly suggestions for the injuries autocomplete. */
export const INJURY_SUGGESTIONS: string[] = [
  "Lower back", "Knee", "Shoulder", "Neck", "Wrist", "Ankle", "Hip", "Elbow",
];

export const DIET_OPTIONS: ChipOption<DietType>[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "non_vegetarian", label: "Non-vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "jain", label: "Jain" },
];

export const YES_NO_OPTIONS: ChipOption<boolean>[] = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

export const ALLERGY_SUGGESTIONS = [
  "Peanuts", "Tree nuts", "Milk", "Eggs", "Wheat", "Soy", "Fish", "Shellfish", "Sesame", "Mustard",
];
export const INTOLERANCE_SUGGESTIONS = ["Lactose", "Gluten", "Spicy food", "Onion and garlic", "Fried food"];
export const CUISINE_SUGGESTIONS = [
  "North Indian", "South Indian", "Gujarati", "Maharashtrian", "Bengali", "Punjabi", "Rajasthani",
  "Kerala", "Andhra and Telangana", "Indo-Chinese", "Continental",
];
export const FOOD_SUGGESTIONS = [
  "Paneer", "Dal", "Rajma", "Chole", "Eggs", "Chicken", "Fish", "Curd", "Oats", "Poha", "Idli",
  "Dosa", "Rice", "Roti", "Fruits", "Sprouts", "Soya chunks", "Karela", "Baingan", "Mushroom",
];
/** Commonly disliked foods first, so they're visible without "More". */
export const DISLIKE_SUGGESTIONS = [
  "Karela", "Baingan", "Mushroom", "Lauki", "Tinda", "Bhindi", "Arbi", "Methi", "Soya chunks",
  "Paneer", "Eggs", "Fish", "Chicken", "Rajma", "Chole", "Oats", "Curd", "Poha",
];

export const COOK_OPTIONS: ChipOption<Cook>[] = [
  { value: "self", label: "I cook" },
  { value: "family", label: "Family cooks" },
  { value: "cook", label: "A cook or helper" },
  { value: "mess_or_canteen", label: "Mess, PG or canteen" },
  { value: "mixed", label: "A mix" },
];

export const EAT_OUT_OPTIONS: ChipOption<EatOutFrequency>[] = [
  { value: "rarely", label: "Rarely" },
  { value: "weekly", label: "About once a week" },
  { value: "few_times_a_week", label: "A few times a week" },
  { value: "daily", label: "Most days" },
];

/** Daily food budget bands; the value is a representative amount in INR. */
export const BUDGET_OPTIONS: ChipOption<number>[] = [
  { value: 120, label: "Under ₹150" },
  { value: 225, label: "₹150 to ₹300" },
  { value: 400, label: "₹300 to ₹500" },
  { value: 650, label: "₹500 to ₹800" },
  { value: 1000, label: "Over ₹800" },
];

export const PANTRY_SUGGESTIONS = [
  "Atta", "Rice", "Dal", "Besan", "Poha", "Suji", "Oats", "Milk", "Curd", "Paneer", "Eggs",
  "Chicken", "Fish", "Soya chunks", "Peanuts", "Seasonal vegetables", "Fruits", "Sprouts",
];

export const WORK_SCHEDULE_OPTIONS: ChipOption<WorkSchedule>[] = [
  { value: "day", label: "Day job" },
  { value: "night_shift", label: "Night shift" },
  { value: "rotating_shifts", label: "Rotating shifts" },
  { value: "student", label: "Student" },
  { value: "at_home", label: "Work from home or homemaker" },
  { value: "other", label: "Other" },
];

export const MEALS_PER_DAY_OPTIONS: ChipOption<number>[] = [2, 3, 4, 5, 6].map((n) => ({
  value: n,
  label: String(n),
}));

export const ONBOARDING_STRINGS = {
  tags: {
    selected: (count: number) => `${count} selected`,
    more: (count: number) => `+${count} more`,
    less: "Show fewer",
    addChip: "Add your own",
    addPlaceholder: "Add something not listed",
    addHint: "Press Enter to add. Separate several with commas.",
    addAria: (label: string) => `Add to ${label.toLowerCase()}`,
    remove: (item: string) => `Remove ${item}`,
  },
  title: "Set up your profile",
  updateTitle: "Update your answers",
  subtitle: "A few quick questions so your plan fits your body, food and routine.",
  stepCounter: (current: number, total: number) => `Step ${current} of ${total}`,
  optionalHint: "Optional. Skip anything you'd rather not answer; you can add it later from your profile.",
  actions: {
    back: "Back",
    next: "Next",
    skip: "Skip for now",
    submit: "Finish setup",
    update: "Save answers",
    submitting: "Saving",
  },
  steps: {
    personal: {
      title: "About you",
      fields: {
        age: "Age",
        gender: "Gender",
        weight: "Weight (kg)",
        bodyFat: "Body fat % (optional)",
        bodyFatHint: "Only if you know it from a scan or test. It makes your calorie estimate more accurate.",
        reproductive: "Are you pregnant or breastfeeding?",
        reproductiveHint: "We won't suggest a calorie deficit during pregnancy or breastfeeding.",
      },
      bmiLabel: "Your BMI",
      bmiHint: "Calculated automatically from your weight and height.",
      bmiValue: (value: number, category: string) => `${value}, ${category}`,
    },
    goal: {
      title: "What's your main goal?",
      helper: "Pick the one that matters most right now.",
      pace: "How fast?",
      targetWeight: "Target weight in kg (optional)",
    },
    activity: {
      title: "How active are you?",
      helper: "Think about a normal day, not counting workouts.",
      workoutDays: "Workout days per week",
      workoutTime: "When do you usually train?",
    },
    training: {
      title: "Your training",
      experience: "Experience",
      equipment: "Equipment you can use (choose at least one)",
      injuries: "Injuries or limitations",
      injuriesPlaceholder: "e.g. Lower back, Knee",
    },
    food: {
      title: "What do you eat?",
      dietType: "Diet",
      eatsDairy: "Do you have milk, curd or paneer?",
      allergies: "Food allergies",
      intolerances: "Foods that don't agree with you",
      cuisines: "Cuisines you enjoy",
      likes: "Foods you like",
      dislikes: "Foods you dislike or won't eat",
      tagPlaceholder: "Add something not listed",
    },
    access: {
      title: "Your kitchen and budget",
      whoCooks: "Who cooks most of your meals?",
      eatsOut: "How often do you eat out or order in?",
      budget: "Rough daily food budget",
      pantry: "What's usually available at home?",
      openToNew: "Happy to buy a few new ingredients?",
      region: "City or state (optional)",
      regionHint: "Helps suggest foods that are easy to find where you live.",
    },
    routine: {
      title: "Your daily routine",
      wake: "Wake up",
      sleep: "Sleep",
      workSchedule: "Work or study pattern",
      mealsPerDay: "Meals a day, including snacks",
      water: "Glasses of water a day (roughly)",
    },
    targets: {
      title: "Your daily targets",
      helper: "Worked out from your answers. You can change your answers any time from your profile.",
      loading: "Working out your targets",
      error: "Couldn't calculate targets right now. You can still finish; they'll be ready on your nutrition page.",
    },
  },
  validation: {
    ageRequired: "Enter your age",
    ageRange: "Age must be between 13 and 100",
    genderRequired: "Select your gender",
    weightRequired: "Enter your weight",
    weightRange: "Weight must be between 30 and 300 kg",
    heightRequired: "Enter your height",
    heightRange: "Height must be between 100 and 250 cm (about 3 ft 4 in to 8 ft 2 in)",
    bodyFatRange: "Body fat must be between 3 and 60%",
    goalRequired: "Choose a goal to continue",
    targetWeightRange: "Target weight must be between 30 and 300 kg",
    activityRequired: "Choose how active you are",
    experienceRequired: "Choose your experience level",
    equipmentRequired: "Select at least one option",
  },
  success: "Profile complete. Your targets are ready.",
  updated: "Answers saved. Your targets have been updated.",
  error: "Could not save your profile. Please try again.",
} as const;

/** Starting form state. */
export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  age: "",
  gender: "",
  weight_kg: "",
  height_cm: "",
  body_fat_percent: "",
  reproductive_status: "",
  fitness_goal: "",
  goal_pace: "",
  target_weight_kg: "",
  activity_level: "",
  workout_days_per_week: "",
  workout_time: "",
  experience_level: "",
  available_equipment: [],
  injuries: [],
  food_preferences: {},
  food_access: {},
  lifestyle: {},
};
