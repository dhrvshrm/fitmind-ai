import { useState } from 'react';
import { Alert, Box, Button, Chip, IconButton, Skeleton, Tooltip, Typography } from '@mui/material';
import { AddRounded, CelebrationRounded, CloseRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { PROGRESS_STRINGS, WEEKDAY_SHORT } from '../../constants/progressStrings';
import { useFlexibleWeek, useUnmarkFlexibleDay } from '../../hooks/queries/useProgressQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import type { DayTarget, FlexibleDay } from '../../types/progress';
import { toIsoDate } from '../../utils/date';
import { ErrorState } from '../ui/ErrorState';
import { SectionCard } from '../ui/SectionCard';
import { FlexibleDayDialog } from './FlexibleDayDialog';
import { flexibleWeekCardStyles as styles } from './FlexibleWeekCard.styles';

const S = PROGRESS_STRINGS.flexible;

function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T00:00:00`).getDay() + 6) % 7;
}

type DayCellProps = {
  day: DayTarget;
  flex: FlexibleDay | undefined;
  isToday: boolean;
  busy: boolean;
  onRemove: (date: string) => void;
};

function DayCell({ day, flex, isToday, busy, onRemove }: DayCellProps) {
  return (
    <Box sx={styles.cell(day.flexible, isToday)}>
      <Typography variant="caption" sx={styles.weekday}>
        {isToday ? S.today : WEEKDAY_SHORT[weekdayIndex(day.date)]}
      </Typography>
      <Typography variant="body2" sx={styles.kcal}>
        {day.calories.toLocaleString()}
      </Typography>
      {day.flexible && (
        <Chip size="small" color="primary" icon={<CelebrationRounded />} label={S.reasons[flex?.reason ?? ''] ?? S.flexibleChip} sx={styles.chip} />
      )}
      {!day.flexible && day.adjustment !== 0 && (
        <Typography variant="caption" color="text.secondary">
          {S.rebalanceChip(day.adjustment)}
        </Typography>
      )}
      {day.flexible && (
        <Tooltip title={S.remove}>
          <span>
            <IconButton size="small" aria-label={S.remove} onClick={() => onRemove(day.date)} disabled={busy} sx={styles.remove}>
              <CloseRounded fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}

/** The week's daily calorie targets, with flexible days and the small rebalance around them. */
export function FlexibleWeekCard() {
  const week = useFlexibleWeek();
  const unmark = useUnmarkFlexibleDay();
  const [open, setOpen] = useState(false);
  const data = week.data;
  const error = queryErrorMessage(week.error, S.error);
  const today = toIsoDate(new Date());

  async function handleRemove(date: string) {
    try {
      await unmark.mutateAsync(date);
      toast.success(S.removed);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  const action = data && data.days.length > 0 && (
    <Button size="small" startIcon={<AddRounded />} onClick={() => setOpen(true)}>
      {S.add}
    </Button>
  );

  return (
    <SectionCard title={S.title} subtitle={S.subtitle} action={action || undefined}>
      {week.isPending && <Skeleton variant="rounded" height={96} />}
      {error && !data && <ErrorState message={error} onRetry={() => week.refetch()} />}
      {data && data.days.length === 0 && <Alert severity="info">{S.noTargets}</Alert>}
      {data && data.days.length > 0 && (
        <Box sx={styles.strip}>
          {data.days.map((day) => (
            <DayCell
              key={day.date}
              day={day}
              flex={data.flexible_days.find((f) => f.date === day.date)}
              isToday={day.date === today}
              busy={unmark.isPending}
              onRemove={handleRemove}
            />
          ))}
        </Box>
      )}
      {data && open && <FlexibleDayDialog open={open} week={data} onClose={() => setOpen(false)} />}
    </SectionCard>
  );
}
