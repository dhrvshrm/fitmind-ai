/** All user-facing copy lives here so it stays consistent and easy to change. */
export const STRINGS = {
  app: {
    name: 'FitMind AI',
    tagline: 'Your AI-powered fitness coach',
  },
  login: {
    title: 'Welcome back',
    subtitle: 'Log in to continue your journey',
    submit: 'Log in',
    submitting: 'Logging in…',
    switchPrompt: "Don't have an account?",
    switchAction: 'Sign up',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'Start training smarter today',
    submit: 'Sign up',
    submitting: 'Creating account…',
    switchPrompt: 'Already have an account?',
    switchAction: 'Log in',
  },
  fields: {
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
  },
  validation: {
    emailRequired: 'Email is required',
    emailInvalid: 'Enter a valid email address',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordWeak: 'Add upper, lower, number, or symbol to strengthen it',
    confirmRequired: 'Please confirm your password',
    confirmMismatch: 'Passwords do not match',
  },
  errors: {
    loginFailed: 'Could not log in. Check your credentials and try again.',
    signupFailed: 'Could not create your account. Please try again.',
    network: 'Cannot reach the server. Is the backend running?',
    generic: 'Something went wrong. Please try again.',
  },
  toast: {
    loggedIn: 'Welcome back!',
    signedUp: 'Account created!',
    loggedOut: 'You have been logged out',
  },
  passwordStrength: {
    label: 'Password strength',
    levels: ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'],
  },
  placeholder: {
    signedInAs: 'Signed in as',
    logout: 'Log out',
  },
  pages: {
    dashboard: {
      title: 'Dashboard',
      description: 'Your workouts and recovery insights will live here.',
    },
  },
} as const;
