/** All user-facing copy lives here so it stays consistent and easy to change. */
export const STRINGS = {
  app: {
    name: "FitMind AI",
    tagline: "Your AI-powered fitness coach",
    heroTitle: "Train smarter, not just harder",
    features: [
      "AI workout plans built around you",
      "Recovery-aware coaching that adapts",
      "Earn XP and level up as you train",
    ],
  },
  aria: {
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
  login: {
    title: "Welcome back",
    subtitle: "Log in to continue your journey",
    submit: "Log in",
    submitting: "Logging in…",
    switchPrompt: "Don't have an account?",
    switchAction: "Sign up",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start training smarter today",
    submit: "Sign up",
    submitting: "Creating account…",
    switchPrompt: "Already have an account?",
    switchAction: "Log in",
  },
  fields: {
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
  },
  validation: {
    emailRequired: "Email is required",
    emailInvalid: "Enter a valid email address",
    passwordRequired: "Password is required",
    passwordTooShort: "Password must be at least 8 characters",
    passwordWeak: "Add upper, lower, number, or symbol to strengthen it",
    confirmRequired: "Please confirm your password",
    confirmMismatch: "Passwords do not match",
  },
  errors: {
    loginFailed: "Could not log in. Check your credentials and try again.",
    signupFailed: "Could not create your account. Please try again.",
    network: "Cannot reach the server. Is the backend running?",
    generic: "Something went wrong. Please try again.",
  },
  toast: {
    loggedIn: "Welcome back!",
    signedUp: "Account created!",
    loggedOut: "You have been logged out",
  },
  passwordStrength: {
    label: "Password strength",
    levels: ["Too weak", "Weak", "Fair", "Good", "Strong"],
  },
  nav: {
    dashboard: "Dashboard",
    workouts: "Workouts",
    recovery: "Recovery",
    voiceCheckin: "Voice Check-in",
    nutrition: "Nutrition",
    gamification: "Gamification",
    friends: "Friends",
    profile: "Profile",
    settings: "Settings",
  },
  navbar: {
    openMenuAria: "Open navigation menu",
    notificationsAria: "Notifications",
    accountAria: "Account menu",
    signedInAs: "Signed in as",
    logout: "Log out",
  },
  dashboard: {
    welcome: (name: string) => `Welcome back, ${name}!`,
    subtitle: "Here's your training snapshot for today.",
    stats: {
      xp: "XP",
      level: "Level",
      streak: "Day streak",
      workoutsToday: "Workouts today",
    },
    quickActions: "Quick actions",
    actions: {
      startWorkout: "Start a workout",
      logRecovery: "Recovery check",
      voiceCheckin: "Voice check-in",
      viewProfile: "View profile",
    },
    loadError: "Could not load your dashboard. Please try again.",
  },
  comingSoon: {
    badge: "Coming soon",
    description: (feature: string) =>
      `${feature} is under construction — it will arrive in a future update.`,
  },
} as const;
