import type {
  ExperienceLevel,
  FitnessGoal,
  Gender,
  OnboardingData,
} from "../types/onboarding";

/** A selectable option rendered as a card (emoji icon keeps us dependency-free). */
export type Option<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  icon: string;
};

export const GENDER_OPTIONS: Option<Gender>[] = [
  { value: "male", label: "Male", icon: "♂️" },
  { value: "female", label: "Female", icon: "♀️" },
  { value: "other", label: "Other", icon: "⚧️" },
];

export const GOAL_OPTIONS: Option<FitnessGoal>[] = [
  {
    value: "lose_weight",
    label: "Lose weight",
    description: "Burn fat and get leaner with a calorie-smart plan.",
    icon: "🔥",
  },
  {
    value: "build_muscle",
    label: "Build muscle",
    description: "Gain strength and size with progressive overload.",
    icon: "💪",
  },
  {
    value: "improve_endurance",
    label: "Improve endurance",
    description: "Boost stamina and cardiovascular fitness.",
    icon: "🏃",
  },
  {
    value: "general_fitness",
    label: "General fitness",
    description: "Stay healthy, mobile, and feel your best.",
    icon: "✨",
  },
];

export const EXPERIENCE_OPTIONS: Option<ExperienceLevel>[] = [
  {
    value: "beginner",
    label: "Beginner",
    description:
      "New to training or returning after a long break. e.g. never lifted weights.",
    icon: "🌱",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description:
      "Consistent for 6+ months and comfortable with the basics. e.g. train 3x/week.",
    icon: "⚡",
  },
  {
    value: "advanced",
    label: "Advanced",
    description:
      "Years of structured training and strong technique. e.g. tracked programming.",
    icon: "🏆",
  },
  {
    value: "Ultra-advanced",
    label: "Ultra-advanced",
    description:
      "Elite-level athlete with extensive experience. e.g. competitive powerlifter.",
    icon: "🥇",
  },
];

/** Multi-select equipment. Values are sent as-is in `available_equipment`. */
export const EQUIPMENT_OPTIONS: Option[] = [
  { value: "bodyweight", label: "Bodyweight only", icon: "🤸" },
  { value: "dumbbells", label: "Dumbbells", icon: "🏋️" },
  { value: "barbell", label: "Barbell", icon: "🏋️‍♂️" },
  { value: "kettlebell", label: "Kettlebell", icon: "🔔" },
  { value: "resistance_bands", label: "Resistance bands", icon: "➰" },
  { value: "pull_up_bar", label: "Pull-up bar", icon: "🚪" },
  { value: "bench", label: "Bench", icon: "🪑" },
  { value: "cardio_machine", label: "Cardio machine", icon: "🚴" },
  { value: "full_gym", label: "Full gym", icon: "🏟️" },
];

/** Free-text friendly suggestions for the injuries autocomplete. */
export const INJURY_SUGGESTIONS: string[] = [
  "Lower back",
  "Knee",
  "Shoulder",
  "Neck",
  "Wrist",
  "Ankle",
  "Hip",
  "Elbow",
];

export const ONBOARDING_STRINGS = {
  title: "Set up your profile",
  subtitle: "A few quick questions so we can tailor your training.",
  stepCounter: (current: number, total: number) =>
    `Step ${current} of ${total}`,
  actions: {
    back: "Back",
    next: "Next",
    submit: "Finish setup",
    submitting: "Saving…",
  },
  steps: {
    personal: {
      title: "About you",
      fields: {
        age: "Age",
        gender: "Gender",
        weight: "Weight (kg)",
        height: "Height (cm)",
      },
      bmiLabel: "Your BMI",
      bmiHint: "Calculated automatically from your weight and height.",
    },
    goal: {
      title: "What's your main goal?",
      helper: "Pick the one that matters most right now.",
    },
    experience: {
      title: "What's your experience level?",
      helper: "This sets the starting difficulty of your plan.",
    },
    equipment: {
      title: "What equipment do you have?",
      helper: "Select everything you can access. Choose at least one.",
    },
    injuries: {
      title: "Any injuries or limitations?",
      helper:
        "Optional - pick from suggestions or type your own. Leave empty if none.",
      placeholder: "e.g. Lower back, Knee…",
    },
  },
  validation: {
    ageRequired: "Enter your age",
    ageRange: "Age must be between 13 and 100",
    genderRequired: "Select your gender",
    weightRequired: "Enter your weight",
    weightRange: "Weight must be between 30 and 300 kg",
    heightRequired: "Enter your height",
    heightRange: "Height must be between 100 and 250 cm",
    goalRequired: "Choose a goal to continue",
    experienceRequired: "Choose your experience level",
    equipmentRequired: "Select at least one option",
  },
  success: "Profile complete! Let’s get started.",
  error: "Could not save your profile. Please try again.",
} as const;

/** Starting form state. */
export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  age: "",
  gender: "",
  weight_kg: "",
  height_cm: "",
  fitness_goal: "",
  experience_level: "",
  available_equipment: [],
  injuries: [],
};
