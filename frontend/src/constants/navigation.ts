import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import {
  ChatRounded,
  DashboardRounded,
  EmojiEventsRounded,
  FitnessCenterRounded,
  GroupRounded,
  MenuBookRounded,
  MicRounded,
  MonitorHeartRounded,
  RestaurantRounded,
  SummarizeRounded,
} from '@mui/icons-material';
import { ROUTES } from './routes';
import { STRINGS } from './strings';
import { ACTIVITY_STRINGS } from './activityStrings';
import { DirectionsWalkRounded } from '@mui/icons-material';

export type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<SvgIconProps>;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Sidebar sections in display order. Profile and settings live in the
 * account menu (top right), not here, to keep the sidebar about daily use.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: STRINGS.nav.groups.today,
    items: [
      { label: STRINGS.nav.dashboard, path: ROUTES.DASHBOARD, icon: DashboardRounded },
      { label: STRINGS.nav.coach, path: ROUTES.COACH, icon: ChatRounded },
    ],
  },
  {
    label: STRINGS.nav.groups.track,
    items: [
      { label: STRINGS.nav.nutrition, path: ROUTES.NUTRITION, icon: RestaurantRounded },
      { label: STRINGS.nav.mealPlan, path: ROUTES.MEAL_PLAN, icon: MenuBookRounded },
      { label: STRINGS.nav.workouts, path: ROUTES.WORKOUTS, icon: FitnessCenterRounded },
      { label: ACTIVITY_STRINGS.nav.activity, path: ROUTES.ACTIVITY, icon: DirectionsWalkRounded },
      { label: STRINGS.nav.recovery, path: ROUTES.RECOVERY, icon: MonitorHeartRounded },
      { label: STRINGS.nav.voiceCheckin, path: ROUTES.VOICE_CHECKIN, icon: MicRounded },
    ],
  },
  {
    label: STRINGS.nav.groups.progress,
    items: [
      { label: STRINGS.nav.reports, path: ROUTES.REPORTS, icon: SummarizeRounded },
      { label: STRINGS.nav.gamification, path: ROUTES.GAMIFICATION, icon: EmojiEventsRounded },
      { label: STRINGS.nav.friends, path: ROUTES.FRIENDS, icon: GroupRounded },
    ],
  },
];

export const SIDEBAR_WIDTH = 248;
