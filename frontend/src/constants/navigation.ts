import type { ComponentType } from 'react';
import {
  ChatRounded,
  DashboardRounded,
  EmojiEventsRounded,
  FitnessCenterRounded,
  GroupRounded,
  MicRounded,
  MonitorHeartRounded,
  PersonRounded,
  RestaurantRounded,
  SettingsRounded,
} from '@mui/icons-material';
import { ROUTES } from './routes';
import { STRINGS } from './strings';

export type NavItem = {
  label: string;
  path: string;
  icon: ComponentType;
};

/** Sidebar entries in display order. */
export const NAV_ITEMS: NavItem[] = [
  { label: STRINGS.nav.dashboard, path: ROUTES.DASHBOARD, icon: DashboardRounded },
  { label: STRINGS.nav.coach, path: ROUTES.COACH, icon: ChatRounded },
  { label: STRINGS.nav.workouts, path: ROUTES.WORKOUTS, icon: FitnessCenterRounded },
  { label: STRINGS.nav.recovery, path: ROUTES.RECOVERY, icon: MonitorHeartRounded },
  { label: STRINGS.nav.voiceCheckin, path: ROUTES.VOICE_CHECKIN, icon: MicRounded },
  { label: STRINGS.nav.nutrition, path: ROUTES.NUTRITION, icon: RestaurantRounded },
  { label: STRINGS.nav.gamification, path: ROUTES.GAMIFICATION, icon: EmojiEventsRounded },
  { label: STRINGS.nav.friends, path: ROUTES.FRIENDS, icon: GroupRounded },
  { label: STRINGS.nav.profile, path: ROUTES.PROFILE, icon: PersonRounded },
  { label: STRINGS.nav.settings, path: ROUTES.SETTINGS, icon: SettingsRounded },
];

export const SIDEBAR_WIDTH = 240;

/** Unread notification count shown on the navbar bell. TODO(Day 12): fetch real count. */
export const UNREAD_NOTIFICATIONS_PLACEHOLDER = 0;
