import { CssBaseline, ThemeProvider } from '@mui/material';
import { GroupRounded, PersonRounded, SettingsRounded } from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { useAuthBootstrap } from './hooks/useAuth';
import { ROUTES } from './constants/routes';
import { STRINGS } from './constants/strings';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { AppLayout } from './components/shared/AppLayout';
import { ComingSoonPage } from './components/shared/ComingSoonPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { RecoveryPage } from './components/recovery/RecoveryPage';
import { VoiceCheckinPage } from './components/voicecheckin/VoiceCheckinPage';
import { WorkoutPage } from './components/workout/WorkoutPage';
import { NutritionPage } from './components/nutrition/NutritionPage';
import { GamificationPage } from './components/gamification/GamificationPage';
import { CoachPage } from './components/coach/CoachPage';

/** Declares the route tree. Runs the auth bootstrap once on mount. */
function AppRoutes() {
  // Validate any persisted session before protected routes resolve.
  useAuthBootstrap();

  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.SIGNUP} element={<SignupPage />} />

      {/* Everything below requires authentication. */}
      <Route element={<ProtectedRoute />}>
        {/* Onboarding is a full-screen flow outside the app shell. */}
        <Route path={ROUTES.ONBOARDING} element={<OnboardingFlow />} />

        {/* Feature pages render inside the navbar + sidebar shell. */}
        <Route element={<AppLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.COACH} element={<CoachPage />} />
          <Route path={ROUTES.WORKOUTS} element={<WorkoutPage />} />
          <Route path={ROUTES.RECOVERY} element={<RecoveryPage />} />
          <Route path={ROUTES.VOICE_CHECKIN} element={<VoiceCheckinPage />} />
          <Route path={ROUTES.NUTRITION} element={<NutritionPage />} />
          <Route path={ROUTES.GAMIFICATION} element={<GamificationPage />} />
          <Route
            path={ROUTES.FRIENDS}
            element={<ComingSoonPage title={STRINGS.nav.friends} icon={GroupRounded} />}
          />
          <Route
            path={ROUTES.PROFILE}
            element={<ComingSoonPage title={STRINGS.nav.profile} icon={PersonRounded} />}
          />
          <Route
            path={ROUTES.SETTINGS}
            element={<ComingSoonPage title={STRINGS.nav.settings} icon={SettingsRounded} />}
          />
        </Route>
      </Route>

      {/* Default + unknown paths go to the dashboard (which will bounce to login if needed). */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-center" />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
