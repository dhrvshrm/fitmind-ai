import { useMediaQuery } from '@mui/material';
import { usePreferencesStore } from '../store/preferencesStore';
import type { ColorMode } from '../theme';

/** The color mode actually in effect, resolving `system` from the OS setting. */
export function useResolvedColorMode(): ColorMode {
  const preference = usePreferencesStore((s) => s.colorMode);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}
