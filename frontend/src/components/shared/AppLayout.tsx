import { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { appLayoutStyles as styles } from './AppLayout.styles';

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
        <Outlet />
      </Box>
    </Box>
  );
}
