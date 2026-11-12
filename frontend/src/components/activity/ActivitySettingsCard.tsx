import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { NotificationsActiveRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import { BREAK_INTERVAL_OPTIONS, MAX_STEP_TARGET, MIN_STEP_TARGET } from '../../constants/activity';
import { useActivitySettings, useUpdateActivitySettings } from '../../hooks/queries/useActivityQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import type { ActivitySettings } from '../../types/activity';
import { parseSteps } from '../../utils/activity';
import { ErrorState } from '../ui/ErrorState';
import { SectionCard } from '../ui/SectionCard';
import { activitySettingsCardStyles as styles } from './ActivitySettingsCard.styles';

const T = ACTIVITY_STRINGS.target;
const B = ACTIVITY_STRINGS.breaks;

type BreakDraft = Pick<
  ActivitySettings,
  'break_reminders_enabled' | 'work_start' | 'work_end' | 'break_interval_minutes' | 'work_days'
>;

type NotifyState = 'unsupported' | NotificationPermission;

function notifyState(): NotifyState {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

/** Step target and work-hours break reminder settings. */
export function ActivitySettingsCard() {
  const settings = useActivitySettings();
  const update = useUpdateActivitySettings();
  const [targetText, setTargetText] = useState<string | null>(null);
  const [draft, setDraft] = useState<BreakDraft | null>(null);
  const [permission, setPermission] = useState<NotifyState>(notifyState);

  const data = settings.data;
  const error = queryErrorMessage(settings.error, B.saveError);
  if (error && !data) {
    return (
      <SectionCard title={T.title}>
        <ErrorState message={error} onRetry={() => settings.refetch()} />
      </SectionCard>
    );
  }
  if (!data) {
    return (
      <SectionCard title={T.title}>
        <Skeleton variant="rounded" height={260} />
      </SectionCard>
    );
  }

  const current: BreakDraft = draft ?? {
    break_reminders_enabled: data.break_reminders_enabled,
    work_start: data.work_start,
    work_end: data.work_end,
    break_interval_minutes: data.break_interval_minutes,
    work_days: data.work_days,
  };
  const targetValue = targetText ?? String(data.effective_step_target);

  function change(patch: Partial<BreakDraft>) {
    setDraft({ ...current, ...patch });
  }

  function toggleDay(day: number) {
    const days = current.work_days.includes(day)
      ? current.work_days.filter((d) => d !== day)
      : [...current.work_days, day].sort();
    change({ work_days: days });
  }

  async function saveTarget(reset: boolean) {
    const parsed = parseSteps(targetValue, MAX_STEP_TARGET);
    if (!reset && (parsed === null || parsed < MIN_STEP_TARGET)) {
      toast.error(T.invalid);
      return;
    }
    try {
      await update.mutateAsync(reset ? { reset_step_target: true } : { step_target: parsed });
      setTargetText(null);
      toast.success(T.saved);
    } catch (err) {
      toast.error(resolveApiError(err, B.saveError));
    }
  }

  async function saveBreaks() {
    if (current.work_start === current.work_end) {
      toast.error(B.sameTimes);
      return;
    }
    if (current.break_reminders_enabled && current.work_days.length === 0) {
      toast.error(B.noDays);
      return;
    }
    try {
      await update.mutateAsync(current);
      setDraft(null);
      toast.success(B.saved);
    } catch (err) {
      toast.error(resolveApiError(err, B.saveError));
    }
  }

  async function askPermission() {
    if (permission === 'unsupported') return;
    setPermission(await Notification.requestPermission());
  }

  return (
    <SectionCard title={T.title} subtitle={T.subtitle}>
      <Stack sx={styles.row}>
        <TextField
          size="small"
          label={T.label}
          value={targetValue}
          onChange={(e) => setTargetText(e.target.value)}
          helperText={T.suggested(data.default_step_target)}
          sx={styles.targetField}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
          disabled={update.isPending}
        />
        <Button variant="contained" onClick={() => saveTarget(false)} disabled={update.isPending}>
          {T.save}
        </Button>
        {data.step_target !== null && (
          <Button onClick={() => saveTarget(true)} disabled={update.isPending}>
            {T.useSuggested}
          </Button>
        )}
      </Stack>

      <Divider sx={styles.divider} />

      <Typography variant="h6" component="h3">
        {B.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={styles.subtitle}>
        {B.subtitle}
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={current.break_reminders_enabled}
            onChange={(e) => change({ break_reminders_enabled: e.target.checked })}
          />
        }
        label={B.enable}
      />

      <Box sx={styles.fields}>
        <TextField
          size="small"
          type="time"
          label={B.workStart}
          value={current.work_start}
          onChange={(e) => change({ work_start: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
          disabled={!current.break_reminders_enabled}
        />
        <TextField
          size="small"
          type="time"
          label={B.workEnd}
          value={current.work_end}
          onChange={(e) => change({ work_end: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
          disabled={!current.break_reminders_enabled}
        />
        <TextField
          select
          size="small"
          label={B.interval}
          value={current.break_interval_minutes}
          onChange={(e) => change({ break_interval_minutes: Number(e.target.value) })}
          disabled={!current.break_reminders_enabled}
        >
          {BREAK_INTERVAL_OPTIONS.map((minutes) => (
            <MenuItem key={minutes} value={minutes}>
              {B.intervalOption(minutes)}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Typography variant="caption" color="text.secondary" component="p" sx={styles.daysLabel}>
        {B.workDays}
      </Typography>
      <Stack sx={styles.days}>
        {B.weekdays.map((label, day) => (
          <Chip
            key={label}
            label={label}
            clickable
            color={current.work_days.includes(day) ? 'primary' : 'default'}
            variant={current.work_days.includes(day) ? 'filled' : 'outlined'}
            onClick={() => toggleDay(day)}
            disabled={!current.break_reminders_enabled}
            aria-pressed={current.work_days.includes(day)}
          />
        ))}
      </Stack>

      {current.break_reminders_enabled && (
        <Box sx={styles.notify}>
          {permission === 'default' && (
            <Button size="small" startIcon={<NotificationsActiveRounded />} onClick={askPermission}>
              {B.notifyAllow}
            </Button>
          )}
          {permission === 'granted' && (
            <Typography variant="caption" color="text.secondary">
              {B.notifyOn}
            </Typography>
          )}
          {permission === 'denied' && <Alert severity="info">{B.notifyBlocked}</Alert>}
          {permission === 'unsupported' && <Alert severity="info">{B.notifyUnsupported}</Alert>}
        </Box>
      )}

      <Box sx={styles.actions}>
        <Button
          variant="contained"
          onClick={saveBreaks}
          disabled={update.isPending || draft === null}
          startIcon={update.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {B.save}
        </Button>
      </Box>
    </SectionCard>
  );
}
