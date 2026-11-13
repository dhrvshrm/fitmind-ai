import { useState } from 'react';
import { Box, Button, Drawer, IconButton, Link, Stack, useScrollTrigger } from '@mui/material';
import { ArrowForwardRounded, CloseRounded, MenuRounded } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { ROUTES } from '../../constants/routes';
import { useActiveSection } from '../../hooks/useActiveSection';
import { Wordmark } from '../ui/Wordmark';
import { landingNavStyles as styles } from './LandingNav.styles';

const N = LANDING_STRINGS.nav;
const LINKS = [
  { id: 'day', label: N.day },
  { id: 'promises', label: N.promises },
  { id: 'faq', label: N.faq },
] as const;
const SECTION_IDS = LINKS.map((link) => link.id);
/** How far the page scrolls before the bar tightens up. */
const COMPACT_AFTER_PX = 24;

/** The app's mark alone: the neel tile with the dumbbell (public/favicon.svg). */
export function BrandMark({ size = 32 }: { size?: number }) {
  return <Box component="img" src="/favicon.svg" alt="" width={size} height={size} sx={styles.mark} />;
}

/**
 * A floating pill over the page: the wordmark, section links that underline
 * themselves by hand as you scroll to them, and the way in. It tightens and
 * lifts a little once the page scrolls.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const compact = useScrollTrigger({ disableHysteresis: true, threshold: COMPACT_AFTER_PX });
  const active = useActiveSection(SECTION_IDS);

  return (
    <Box component="header" sx={styles.root}>
      <Stack sx={styles.pill(compact)}>
        <Link component={RouterLink} to={ROUTES.HOME} underline="none" color="inherit" aria-label={LANDING_STRINGS.home}>
          <Wordmark size={compact ? 30 : 34} />
        </Link>

        <Stack component="nav" sx={styles.links}>
          {LINKS.map((link) => (
            <Link
              key={link.id}
              href={`#${link.id}`}
              underline="none"
              color={active === link.id ? 'text.primary' : 'text.secondary'}
              aria-current={active === link.id ? 'true' : undefined}
              sx={styles.link(active === link.id)}
            >
              {link.label}
            </Link>
          ))}
        </Stack>

        <Stack sx={styles.actions}>
          <Button component={RouterLink} to={ROUTES.LOGIN} color="inherit" sx={styles.login}>
            {N.login}
          </Button>
          <Button component={RouterLink} to={ROUTES.SIGNUP} variant="contained" endIcon={<ArrowForwardRounded />} sx={styles.start}>
            {N.start}
          </Button>
          <IconButton aria-label={N.menuAria} onClick={() => setOpen(true)} sx={styles.menuButton}>
            <MenuRounded />
          </IconButton>
        </Stack>
      </Stack>

      <Drawer anchor="top" open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: styles.drawer } }}>
        <Stack sx={styles.drawerHead}>
          <Wordmark size={30} />
          <IconButton aria-label={N.closeAria} onClick={() => setOpen(false)}>
            <CloseRounded />
          </IconButton>
        </Stack>
        <Stack component="nav" sx={styles.drawerLinks}>
          {LINKS.map((link, index) => (
            <Link key={link.id} href={`#${link.id}`} underline="none" color="text.primary" onClick={() => setOpen(false)} sx={styles.drawerLink}>
              <Box component="span" sx={styles.drawerIndex}>
                {String(index + 1).padStart(2, '0')}
              </Box>
              {link.label}
            </Link>
          ))}
        </Stack>
        <Stack sx={styles.drawerActions}>
          <Button component={RouterLink} to={ROUTES.LOGIN} variant="outlined" fullWidth>
            {N.login}
          </Button>
          <Button component={RouterLink} to={ROUTES.SIGNUP} variant="contained" fullWidth>
            {N.start}
          </Button>
        </Stack>
      </Drawer>
    </Box>
  );
}
