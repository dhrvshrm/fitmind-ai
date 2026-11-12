import { Box, Skeleton, Stack, Typography } from '@mui/material';
import {
  BedtimeRounded,
  EggAltRounded,
  EventBusyRounded,
  FreeBreakfastRounded,
  InsightsRounded,
  LocalDrinkRounded,
  RestaurantRounded,
  WeekendRounded,
} from '@mui/icons-material';
import type { SvgIconProps } from '@mui/material';
import type { ComponentType } from 'react';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { usePatterns } from '../../hooks/queries/useProgressQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import type { Pattern } from '../../types/progress';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { IconBadge } from '../ui/IconBadge';
import { Reveal } from '../ui/Reveal';
import { SectionCard } from '../ui/SectionCard';
import { patternsCardStyles as styles } from './PatternsCard.styles';

const S = PROGRESS_STRINGS.patterns;

const ICONS: Record<string, ComponentType<SvgIconProps>> = {
  protein_low_weekends: WeekendRounded,
  late_night_eating: BedtimeRounded,
  skipped_breakfast: FreeBreakfastRounded,
  protein_misses: EggAltRounded,
  calorie_overshoot: RestaurantRounded,
  low_water: LocalDrinkRounded,
  missed_workout_weekdays: EventBusyRounded,
};

/** Turns a pattern code and its numbers into a sentence. Unknown codes are skipped. */
function patternText(pattern: Pattern): string | null {
  const v = pattern.values as never;
  switch (pattern.code) {
    case 'protein_low_weekends':
      return S.protein_low_weekends(v);
    case 'late_night_eating':
      return S.late_night_eating(v);
    case 'skipped_breakfast':
      return S.skipped_breakfast();
    case 'protein_misses':
      return S.protein_misses(v);
    case 'calorie_overshoot':
      return S.calorie_overshoot(v);
    case 'low_water':
      return S.low_water(v);
    case 'missed_workout_weekdays':
      return S.missed_workout_weekdays(v);
    default:
      return null;
  }
}

/** Habits from the last four weeks, each shown only with enough evidence behind it. */
export function PatternsCard() {
  const patterns = usePatterns();
  const error = queryErrorMessage(patterns.error, PROGRESS_STRINGS.page.loadError);
  const items = (patterns.data?.patterns ?? [])
    .map((p) => ({ pattern: p, text: patternText(p) }))
    .filter((item): item is { pattern: Pattern; text: string } => item.text !== null);

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      {patterns.isPending && <Skeleton variant="rounded" height={120} />}
      {error && !patterns.data && <ErrorState message={error} onRetry={() => patterns.refetch()} />}
      {patterns.data && items.length === 0 && (
        <EmptyState compact icon={InsightsRounded} title={S.emptyTitle} description={S.emptyBody} />
      )}
      <Stack sx={styles.list}>
        {items.map(({ pattern, text }, index) => (
          <Reveal key={pattern.code} index={index}>
            <Box sx={styles.item}>
              <IconBadge
                icon={ICONS[pattern.code] ?? InsightsRounded}
                tone={pattern.severity === 'warning' ? 'warning' : 'secondary'}
                size="small"
              />
              <Box sx={styles.text}>
                <Typography variant="body2">{text}</Typography>
                {pattern.code !== 'missed_workout_weekdays' && (
                  <Typography variant="caption" color="text.secondary">
                    {S.evidence(pattern.evidence_days, pattern.evidence_of)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Reveal>
        ))}
      </Stack>
    </SectionCard>
  );
}
