import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import {
  LocalDrinkRounded,
  LocalFireDepartmentRounded,
  MicRounded,
  MonitorHeartRounded,
  RestaurantRounded,
  WorkspacePremiumRounded,
} from '@mui/icons-material';

/**
 * Icon per badge id, matched against `app/models/gamification.py`'s
 * `BADGE_CATALOG` on the backend. Unrecognised ids (a badge added there
 * without a matching entry here) fall back to `DEFAULT_BADGE_ICON`.
 */
export const BADGE_ICONS: Record<string, ComponentType<SvgIconProps>> = {
  seven_day_warrior: LocalFireDepartmentRounded,
  recovery_king: MonitorHeartRounded,
  clean_eater: RestaurantRounded,
  voice_native: MicRounded,
  century_club: WorkspacePremiumRounded,
  hydration_hero: LocalDrinkRounded,
};

export const DEFAULT_BADGE_ICON: ComponentType<SvgIconProps> = WorkspacePremiumRounded;

export function getBadgeIcon(badgeId: string): ComponentType<SvgIconProps> {
  return BADGE_ICONS[badgeId] ?? DEFAULT_BADGE_ICON;
}
