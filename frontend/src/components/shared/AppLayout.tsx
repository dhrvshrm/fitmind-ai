import { Suspense, useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { PageLoader } from '../ui/PageLoader';
import { appLayoutStyles as styles } from './AppLayout.styles';
import { BreakReminderNudge } from '../activity/BreakReminderNudge';

/**
 * Authenticated app shell: fixed navbar, responsive sidebar, and the routed
 * page in the main content area.
 */
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={styles.root}>
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box component="main" sx={styles.main}>
        {/* Spacer pushes content below the fixed navbar. */}
        <Toolbar />
        <Box sx={styles.content}>
          {/* Keeps the shell visible while a page's code chunk loads. */}
          <Suspense fallback={<PageLoader />}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </Box>
      </Box>
      {/* Work-hours break nudge; silent until reminders are switched on. */}
      <BreakReminderNudge />
    </Box>
  );
}
