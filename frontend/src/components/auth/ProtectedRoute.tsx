import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { protectedRouteStyles as styles } from './ProtectedRoute.styles';

/** Full-screen centered spinner used while auth state is resolving. */
function FullScreenLoader() {
  return (
    <Box sx={styles.loader}>
      <CircularProgress />
    </Box>
  );
}

/**
 * Guards nested routes. While the app is confirming a persisted session it shows
 * a spinner; unauthenticated users are redirected to login (remembering where
 * they were headed so they can be sent back after logging in).
 */
export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
