import type { ComponentType } from 'react';
import { Chip, Tooltip, type SvgIconProps } from '@mui/material';
import {
  AutoAwesomeRounded,
  EditRounded,
  HelpOutlineRounded,
  PersonRounded,
  VerifiedRounded,
} from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import type { ItemSource, MealSource } from '../../types/nutrition';
import { sourceBadgeStyles as styles } from './SourceBadge.styles';

const S = STRINGS.nutrition.source;

type Tone = 'success' | 'warning' | 'error' | 'default';

type BadgeConfig = {
  label: string;
  tone: Tone;
  icon: ComponentType<SvgIconProps>;
  tooltip?: string;
};

const ITEM_BADGES: Record<ItemSource, BadgeConfig> = {
  INDB: { label: S.INDB, tone: 'success', icon: VerifiedRounded, tooltip: S.tooltipVerified },
  USDA: { label: S.USDA, tone: 'success', icon: VerifiedRounded, tooltip: S.tooltipVerified },
  custom: { label: S.custom, tone: 'success', icon: PersonRounded },
  ai_estimate: { label: S.ai_estimate, tone: 'warning', icon: AutoAwesomeRounded, tooltip: S.tooltipEstimated },
  unresolved: { label: S.unresolved, tone: 'error', icon: HelpOutlineRounded },
  manual: { label: S.manual, tone: 'default', icon: EditRounded },
};

const MEAL_BADGES: Record<MealSource, BadgeConfig> = {
  verified: { label: S.verified, tone: 'success', icon: VerifiedRounded, tooltip: S.tooltipVerified },
  estimated: { label: S.estimated, tone: 'warning', icon: AutoAwesomeRounded, tooltip: S.tooltipEstimated },
  mixed: { label: S.mixed, tone: 'warning', icon: AutoAwesomeRounded, tooltip: S.tooltipEstimated },
  manual: { label: S.manual, tone: 'default', icon: EditRounded },
};

type SourceBadgeProps =
  | { kind: 'item'; source: ItemSource; edited?: boolean }
  | { kind: 'meal'; source: MealSource; edited?: boolean };

/**
 * Shows where a food's numbers come from. Always a text label with an icon,
 * so the distinction never relies on color alone.
 */
export function SourceBadge(props: SourceBadgeProps) {
  const config: BadgeConfig = props.edited
    ? { label: S.edited, tone: 'default', icon: EditRounded }
    : props.kind === 'item'
      ? ITEM_BADGES[props.source]
      : MEAL_BADGES[props.source];
  const Icon = config.icon;
  const chip = (
    <Chip
      size="small"
      variant="outlined"
      color={config.tone}
      icon={<Icon />}
      label={config.label}
      sx={styles.chip}
    />
  );
  return config.tooltip ? <Tooltip title={config.tooltip}>{chip}</Tooltip> : chip;
}
