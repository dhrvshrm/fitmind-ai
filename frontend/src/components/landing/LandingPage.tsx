import { Box } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../hooks/useAuth';
import { ClosingNote } from './ClosingNote';
import { DayTimeline } from './DayTimeline';
import { FaqColumns } from './FaqColumns';
import { HeroMasthead } from './HeroMasthead';
import { LandingFooter } from './LandingFooter';
import { LandingNav } from './LandingNav';
import { PgSection } from './PgSection';
import { PromisesPage } from './PromisesPage';
import { landingPageStyles as styles } from './LandingPage.styles';

/**
 * The public front door, read like a notebook: a masthead, one working day
 * with FitMind, life in a PG or hostel, a page of promises, questions, and
 * a closing line. Someone
 * already signed in goes straight to their day.
 */
export function LandingPage() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  if (!isBootstrapping && isAuthenticated) return <Navigate to={ROUTES.TODAY} replace />;

  return (
    <Box sx={styles.root}>
      <LandingNav />
      <Box component="main">
        <HeroMasthead />
        <DayTimeline />
        <PgSection />
        <PromisesPage />
        <FaqColumns />
        <ClosingNote />
      </Box>
      <LandingFooter />
    </Box>
  );
}
