import type { SvgIconProps } from '@mui/material';
import {
  LocalDrinkRounded,
  LocalFireDepartmentRounded,
  MicRounded,
  MonitorHeartRounded,
  RestaurantRounded,
  WorkspacePremiumRounded,
} from '@mui/icons-material';

type BadgeIconProps = SvgIconProps & {
  badgeId: string;
};

/**
 * Renders a badge's icon by id, matched against `app/models/gamification.py`'s
 * `BADGE_CATALOG` on the backend. Written as a literal switch (rather than
 * picking a component out of a lookup map) because the React Compiler lint
 * rule flags rendering a locally-resolved component reference — only
 * statically-known JSX tags are allowed here.
 */
export function BadgeIcon({ badgeId, ...iconProps }: BadgeIconProps) {
  switch (badgeId) {
    case 'seven_day_warrior':
      return <LocalFireDepartmentRounded {...iconProps} />;
    case 'recovery_king':
      return <MonitorHeartRounded {...iconProps} />;
    case 'clean_eater':
      return <RestaurantRounded {...iconProps} />;
    case 'voice_native':
      return <MicRounded {...iconProps} />;
    case 'century_club':
      return <WorkspacePremiumRounded {...iconProps} />;
    case 'hydration_hero':
      return <LocalDrinkRounded {...iconProps} />;
    default:
      return <WorkspacePremiumRounded {...iconProps} />;
  }
}
