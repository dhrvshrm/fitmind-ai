import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DeleteOutlineRounded, DirectionsWalkRounded, InfoOutlined } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import { MAX_DAILY_STEPS } from '../../constants/activity';
import { useDeleteSteps, useLogSteps, useSteps } from '../../hooks/queries/useActivityQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import type { ActivityEstimate, StepDay } from '../../types/activity';
import { parseSteps } from '../../utils/activity';
import { formatDateLabel } from '../../utils/date';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { ProgressRow } from '../ui/ProgressRow';
import { SectionCard } from '../ui/SectionCard';
import { StatTile } from '../ui/StatTile';
import { StepsChart } from './StepsChart';
import { stepsCardStyles as styles } from './StepsCard.styles';

const S = ACTIVITY_STRINGS.steps;
const E = ACTIVITY_STRINGS.estimate;
const L = ACTIVITY_STRINGS.levels;

function dayLabel(day: StepDay, index: number): string {
  if (index === 0) return S.today;
  if (index === 1) return S.yesterday;
  return formatDateLabel(day.date);
}

function estimateText(activity: ActivityEstimate): string {
  if (activity.source === 'steps' && activity.effective) {
    return E.usingSteps(L[activity.effective], activity.recent_days_logged);
  }
  return E.needMore(activity.days_needed, activity.window_days, activity.recent_days_logged);
}

/** Enter or edit a day's steps, see progress against the target and the last 14 days. */
export function StepsCard() {
  const steps = useSteps();
  const logSteps = useLogSteps();
  const deleteSteps = useDeleteSteps();
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [typed, setTyped] = useState<Record<string, string>>({});

  const summary = steps.data;
  const error = queryErrorMessage(steps.error, S.loadError);
  if (error && !summary) {
    return (
      <SectionCard title={S.title}>
        <ErrorState message={error} onRetry={() => steps.refetch()} />
      </SectionCard>
    );
  }
  if (!summary) {
    return (
      <SectionCard title={S.title}>
        <Skeleton variant="rounded" height={320} />
      </SectionCard>
    );
  }

  const newestFirst = [...summary.days].reverse();
  const selected = chosenDate ?? summary.today;
  const existing = summary.days.find((d) => d.date === selected)?.steps ?? null;
  const value = typed[selected] ?? (existing === null ? '' : String(existing));
  const busy = logSteps.isPending || deleteSteps.isPending;
  const anyLogged = summary.days.some((d) => d.steps !== null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseSteps(value, MAX_DAILY_STEPS);
    if (parsed === null) {
      toast.error(S.invalid);
      return;
    }
    try {
      await logSteps.mutateAsync({ date: selected, steps: parsed });
      setTyped((prev) => ({ ...prev, [selected]: String(parsed) }));
      toast.success(S.saved);
    } catch (err) {
      toast.error(resolveApiError(err, S.saveError));
    }
  }

  async function handleDelete() {
    try {
      await deleteSteps.mutateAsync(selected);
      setTyped((prev) => ({ ...prev, [selected]: '' }));
      toast.success(S.removed);
    } catch (err) {
      toast.error(resolveApiError(err, S.saveError));
    }
  }

  return (
    <SectionCard
      title={S.title}
      subtitle={S.subtitle}
      action={<Chip size="small" icon={<DirectionsWalkRounded />} label={S.targetChip(summary.target)} />}
    >
      <Box component="form" onSubmit={handleSubmit} noValidate sx={styles.form}>
        <TextField
          select
          size="small"
          label={S.dayLabel}
          value={selected}
          onChange={(e) => setChosenDate(e.target.value)}
          sx={styles.dayField}
          disabled={busy}
        >
          {newestFirst.map((day, index) => (
            <MenuItem key={day.date} value={day.date}>
              {dayLabel(day, index)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label={S.stepsLabel}
          value={value}
          onChange={(e) => setTyped((prev) => ({ ...prev, [selected]: e.target.value }))}
          sx={styles.stepsField}
          disabled={busy}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 7 } }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={busy || value.trim() === ''}
          startIcon={logSteps.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {logSteps.isPending ? S.saving : S.save}
        </Button>
        {existing !== null && (
          <Tooltip title={S.remove}>
            <span>
              <IconButton aria-label={S.remove} onClick={handleDelete} disabled={busy}>
                <DeleteOutlineRounded />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      <Box sx={styles.progress}>
        <ProgressRow label={S.todayProgress} value={summary.today_steps ?? 0} goal={summary.target} unit={S.unit} />
      </Box>

      <Box sx={styles.stats}>
        <StatTile
          label={S.average}
          value={summary.average_7d === null ? S.noAverage : summary.average_7d.toLocaleString()}
          icon={DirectionsWalkRounded}
        />
        <StatTile
          label={S.onTarget}
          value={S.onTargetValue(summary.days_on_target, summary.days.filter((d) => d.steps !== null).length)}
          tone="success"
        />
      </Box>

      {anyLogged ? (
        <StepsChart days={summary.days} target={summary.target} />
      ) : (
        <EmptyState compact icon={DirectionsWalkRounded} title={S.emptyTitle} description={S.emptyBody} />
      )}

      <Alert severity={summary.activity.source === 'steps' ? 'success' : 'info'} icon={<InfoOutlined />} sx={styles.estimate}>
        <Typography variant="body2">{estimateText(summary.activity)}</Typography>
        {summary.activity.source === 'steps' && (
          <Typography variant="caption" color="text.secondary" component="p">
            {E.stepsDiffer}
          </Typography>
        )}
      </Alert>

      <Stack sx={styles.syncNote}>
        <Typography variant="caption" color="text.secondary">
          {S.syncNote}
        </Typography>
      </Stack>
    </SectionCard>
  );
}
