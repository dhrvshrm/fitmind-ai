import { useMemo, useState } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { LocalFireDepartmentRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { getStreak } from '../../utils/workout';
import { toIsoDate } from '../../utils/date';
import { workoutHistoryStyles as styles } from './WorkoutHistory.styles';

const S = STRINGS.workout.history;

type WorkoutHistoryProps = {
  /** Completed dates as `YYYY-MM-DD` strings. */
  completedDates: string[];
};

type DayCell = {
  date: string;
  dayOfMonth: number;
};

/** Current-month cells, padded with leading nulls so weekdays align (Mon-first). */
function buildMonthCells(reference: Date): (DayCell | null)[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // JS getDay(): Sunday = 0. Shift so Monday = 0.
  const leadingBlanks = (firstDay.getDay() + 6) % 7;

  const cells: (DayCell | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: toIsoDate(new Date(year, month, day)), dayOfMonth: day });
  }
  return cells;
}

/**
 * Month calendar highlighting completed workout days, with a streak counter.
 * Completion data is local until Day 8 wires real logging.
 */
export function WorkoutHistory({ completedDates }: WorkoutHistoryProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const now = new Date();
  const today = toIsoDate(now);
  const completed = useMemo(() => new Set(completedDates), [completedDates]);
  const cells = useMemo(() => buildMonthCells(now), []);
  const streak = getStreak(completedDates);

  const monthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Stack sx={styles.headerRow}>
        <Typography variant="h6" sx={styles.title}>
          {S.title}
        </Typography>
        <Chip
          icon={<LocalFireDepartmentRounded />}
          label={S.streak(streak)}
          color={streak > 0 ? 'warning' : 'default'}
          variant="outlined"
          sx={styles.streakChip}
        />
      </Stack>

      <Typography variant="body2" sx={styles.monthLabel}>
        {monthLabel}
      </Typography>

      <Box sx={styles.calendarGrid}>
        {S.weekdays.map((weekday, index) => (
          <Typography key={`${weekday}-${index}`} variant="caption" sx={styles.weekday}>
            {weekday}
          </Typography>
        ))}
        {cells.map((cell, index) =>
          cell === null ? (
            <Box key={`blank-${index}`} />
          ) : (
            <Box
              key={cell.date}
              onClick={() => setSelected(cell.date)}
              sx={styles.dayCell({
                completed: completed.has(cell.date),
                isToday: cell.date === today,
                selected: cell.date === selected,
              })}
            >
              {cell.dayOfMonth}
            </Box>
          ),
        )}
      </Box>

      {selected && (
        <Typography variant="body2" color="text.secondary" sx={styles.selectedInfo}>
          {completed.has(selected) ? S.completedOn : S.nothingOn}
        </Typography>
      )}

      {completedDates.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={styles.hint}>
          {S.hint}
        </Typography>
      )}
    </Paper>
  );
}
