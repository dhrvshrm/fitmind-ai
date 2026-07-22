import type { SvgIconProps } from '@mui/material';
import {
  CampaignRounded,
  EmojiEventsRounded,
  FitnessCenterRounded,
  GroupAddRounded,
  HowToRegRounded,
  InsightsRounded,
  LeaderboardRounded,
  LocalFireDepartmentRounded,
  TrendingUpRounded,
} from '@mui/icons-material';

type NotificationTypeIconProps = SvgIconProps & {
  notificationType: string;
};

/**
 * Renders a notification's icon by type. Written as a literal switch (rather
 * than picking a component out of a lookup map and rendering the result)
 * because the React Compiler lint rule flags rendering a locally-resolved
 * component reference — only statically-known JSX tags are allowed here.
 */
export function NotificationTypeIcon({
  notificationType,
  ...iconProps
}: NotificationTypeIconProps) {
  switch (notificationType) {
    case 'follow':
      return <GroupAddRounded {...iconProps} />;
    case 'friend_accepted':
      return <HowToRegRounded {...iconProps} />;
    case 'nudge':
      return <CampaignRounded {...iconProps} />;
    case 'badge_earned':
      return <EmojiEventsRounded {...iconProps} />;
    case 'streak_warning':
      return <LocalFireDepartmentRounded {...iconProps} />;
    case 'workout_logged':
      return <FitnessCenterRounded {...iconProps} />;
    case 'level_up':
      return <TrendingUpRounded {...iconProps} />;
    case 'weekly_report':
      return <InsightsRounded {...iconProps} />;
    case 'leaderboard_change':
      return <LeaderboardRounded {...iconProps} />;
    default:
      return <CampaignRounded {...iconProps} />;
  }
}
