import { CssBaseline, ThemeProvider } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { useAuthBootstrap } from './hooks/useAuth';
import { ROUTES } from './constants/routes';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { AppLayout } from './components/shared/AppLayout';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { Dashboard } from './components/dashboard/Dashboard';
import { RecoveryPage } from './components/recovery/RecoveryPage';
import { VoiceCheckinPage } from './components/voicecheckin/VoiceCheckinPage';
import { WorkoutPage } from './components/workout/WorkoutPage';
import { NutritionPage } from './components/nutrition/NutritionPage';
import { GamificationPage } from './components/gamification/GamificationPage';
import { CoachPage } from './components/coach/CoachPage';
import { FriendsPage } from './components/friends/FriendsPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { SettingsPage } from './components/profile/SettingsPage';

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
          <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
          <Route path={ROUTES.FRIENDS} element={<FriendsPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
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
      <ErrorBoundary>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
