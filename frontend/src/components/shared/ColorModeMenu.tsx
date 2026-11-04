import { useState, type MouseEvent } from 'react';
import { IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from '@mui/material';
import { CheckRounded } from '@mui/icons-material';
import { COLOR_MODE_OPTIONS } from '../../constants/appearance';
import { STRINGS } from '../../constants/strings';
import { usePreferencesStore } from '../../store/preferencesStore';
import { useResolvedColorMode } from '../../hooks/useColorMode';
import { colorModeMenuStyles as styles } from './ColorModeMenu.styles';

/** Navbar button for switching between system, light and dark mode. */
export function ColorModeMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const preference = usePreferencesStore((s) => s.colorMode);
  const setColorMode = usePreferencesStore((s) => s.setColorMode);
  const resolved = useResolvedColorMode();

  const CurrentIcon =
    COLOR_MODE_OPTIONS.find((o) => o.value === resolved)?.icon ?? COLOR_MODE_OPTIONS[0].icon;

  return (
    <>
      <Tooltip title={STRINGS.navbar.colorModeAria}>
        <IconButton
          aria-label={STRINGS.navbar.colorModeAria}
          onClick={(e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
        >
          <CurrentIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {COLOR_MODE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <MenuItem
              key={option.value}
              selected={option.value === preference}
              onClick={() => {
                setColorMode(option.value);
                setAnchor(null);
              }}
              sx={styles.item}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              {option.label}
              {option.value === preference && <CheckRounded fontSize="small" sx={styles.check} />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
