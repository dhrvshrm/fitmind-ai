import { CssBaseline, ThemeProvider } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { useAuthBootstrap } from './hooks/useAuth';
import { ROUTES } from './constants/routes';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PlaceholderPage } from './pages/PlaceholderPage';

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
        <Route
          path={ROUTES.ONBOARDING}
          element={
            <PlaceholderPage
              title="Onboarding"
              description="Tell us about your goals so we can tailor your training."
            />
          }
        />
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <PlaceholderPage
              title="Dashboard"
              description="Your workouts and recovery insights will live here."
            />
          }
        />
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
