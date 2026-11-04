import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import { DarkModeRounded, LightModeRounded, SettingsBrightnessRounded } from '@mui/icons-material';
import { STRINGS } from './strings';
import type { ColorModePreference } from '../store/preferencesStore';

export type ColorModeOption = {
  value: ColorModePreference;
  label: string;
  icon: ComponentType<SvgIconProps>;
};

/** Color mode choices, shown in the navbar menu and on the settings page. */
export const COLOR_MODE_OPTIONS: ColorModeOption[] = [
  { value: 'system', label: STRINGS.navbar.colorModes.system, icon: SettingsBrightnessRounded },
  { value: 'light', label: STRINGS.navbar.colorModes.light, icon: LightModeRounded },
  { value: 'dark', label: STRINGS.navbar.colorModes.dark, icon: DarkModeRounded },
];
