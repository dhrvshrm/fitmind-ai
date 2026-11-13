import { lazy, Suspense, useMemo, type ComponentType } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { createAppTheme } from "./theme";
import { queryClient } from "./lib/queryClient";
import { useAuthBootstrap } from "./hooks/useAuth";
import { useResolvedColorMode } from "./hooks/useColorMode";
import { useAppAnalytics } from "./hooks/useAppAnalytics";
import { AppToaster } from "./components/ui/AppToaster";
import { ROUTES } from "./constants/routes";
import { LoginPage } from "./components/auth/LoginPage";
import { SignupPage } from "./components/auth/SignupPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/shared/AppLayout";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { PageLoader } from "./components/ui/PageLoader";

// Feature pages are split into their own chunks and loaded on first visit,
// so the initial download only contains the shell and the current page.
function lazyPage<K extends string>(
  load: () => Promise<Record<K, ComponentType>>,
  name: K,
) {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}

const LandingPage = lazyPage(
  () => import("./components/landing/LandingPage"),
  "LandingPage",
);
const TodayPage = lazyPage(
  () => import("./components/today/TodayPage"),
  "TodayPage",
);
const Dashboard = lazyPage(
  () => import("./components/dashboard/Dashboard"),
  "Dashboard",
);
const RecoveryPage = lazyPage(
  () => import("./components/recovery/RecoveryPage"),
  "RecoveryPage",
);
const VoiceCheckinPage = lazyPage(
  () => import("./components/voicecheckin/VoiceCheckinPage"),
  "VoiceCheckinPage",
);
const WorkoutPage = lazyPage(
  () => import("./components/workout/WorkoutPage"),
  "WorkoutPage",
);
const NutritionPage = lazyPage(
  () => import("./components/nutrition/NutritionPage"),
  "NutritionPage",
);
const MealPlanPage = lazyPage(
  () => import("./components/mealplan/MealPlanPage"),
  "MealPlanPage",
);
const GamificationPage = lazyPage(
  () => import("./components/gamification/GamificationPage"),
  "GamificationPage",
);
const CoachPage = lazyPage(
  () => import("./components/coach/CoachPage"),
  "CoachPage",
);
const FriendsPage = lazyPage(
  () => import("./components/friends/FriendsPage"),
  "FriendsPage",
);
const ReportsPage = lazyPage(
  () => import("./components/reports/ReportsPage"),
  "ReportsPage",
);
const ProfilePage = lazyPage(
  () => import("./components/profile/ProfilePage"),
  "ProfilePage",
);
const SettingsPage = lazyPage(
  () => import("./components/profile/SettingsPage"),
  "SettingsPage",
);
const OnboardingFlow = lazyPage(
  () => import("./components/onboarding/OnboardingFlow"),
  "OnboardingFlow",
);
const ActivityPage = lazyPage(
  () => import("./components/activity/ActivityPage"),
  "ActivityPage",
);

/** Declares the route tree. Runs the auth bootstrap once on mount. */
function AppRoutes() {
  // Validate any persisted session before protected routes resolve.
  useAuthBootstrap();
  // Phase 7: one "app opened" event per session (no personal details).
  useAppAnalytics();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.HOME} element={<LandingPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignupPage />} />

        {/* Everything below requires authentication. */}
        <Route element={<ProtectedRoute />}>
          {/* Onboarding is a full-screen flow outside the app shell. */}
          <Route path={ROUTES.ONBOARDING} element={<OnboardingFlow />} />

          {/* Feature pages render inside the navbar + sidebar shell. */}
          <Route element={<AppLayout />}>
            <Route path={ROUTES.TODAY} element={<TodayPage />} />
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.COACH} element={<CoachPage />} />
            <Route path={ROUTES.WORKOUTS} element={<WorkoutPage />} />
            <Route path={ROUTES.RECOVERY} element={<RecoveryPage />} />
            <Route path={ROUTES.VOICE_CHECKIN} element={<VoiceCheckinPage />} />
            <Route path={ROUTES.NUTRITION} element={<NutritionPage />} />
            <Route path={ROUTES.MEAL_PLAN} element={<MealPlanPage />} />
            <Route path={ROUTES.GAMIFICATION} element={<GamificationPage />} />
            <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
            <Route path={ROUTES.FRIENDS} element={<FriendsPage />} />
            <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            <Route path={ROUTES.ACTIVITY} element={<ActivityPage />} />
          </Route>
        </Route>

        {/* Unknown paths go home: the landing page, or Today when signed in. */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const mode = useResolvedColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MotionConfig reducedMotion="user">
          <CssBaseline enableColorScheme />
          <AppToaster />
          <ErrorBoundary>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ErrorBoundary>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
