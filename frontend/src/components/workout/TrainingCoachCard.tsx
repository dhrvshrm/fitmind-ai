import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { BatteryChargingFullRounded, MilitaryTechRounded, SpaRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { PROGRESSION_STRINGS } from '../../constants/progressionStrings';
import { useDeload, useLevelUp, useProgression, useSnoozeSuggestion } from '../../hooks/queries/useWorkoutQueries';
import { resolveApiError } from '../../lib/apiClient';
import { formatDateLabel } from '../../utils/date';
import type { LevelCheck, StallReason } from '../../types/workout';
import { IconBadge } from '../ui/IconBadge';
import { SectionCard } from '../ui/SectionCard';
import { trainingCoachCardStyles as styles } from './TrainingCoachCard.styles';

const S = PROGRESSION_STRINGS.coach;
const WEEK_DAYS = 7;

function reasonText(reason: StallReason): string {
  switch (reason.kind) {
    case 'protein':
      return S.reasons.protein(reason.percent, reason.days);
    case 'sleep':
      return S.reasons.sleep(reason.hours);
    case 'recovery':
      return S.reasons.recovery(reason.score);
  }
}

function levelName(level: string): string {
  return S.levels[level] ?? level;
}

function LevelProgress({ level }: { level: LevelCheck }) {
  const next = levelName(level.next_level ?? '');
  const workouts = level.workouts ?? 0;
  const needed = level.workouts_needed ?? 1;
  const lifts = level.lifts ?? [];
  const met = lifts.filter((lift) => lift.met).length;
  const liftsNeeded = level.lifts_needed ?? 1;
  return (
    <Box sx={styles.block}>
      <Stack sx={styles.blockHead}>
        <IconBadge icon={MilitaryTechRounded} tone="primary" />
        <Typography variant="subtitle2">{S.levelProgressTitle(next)}</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {S.workouts(workouts, needed, Math.round((level.window_days ?? 0) / WEEK_DAYS))}
      </Typography>
      <LinearProgress variant="determinate" value={Math.min(100, (workouts / needed) * 100)} sx={styles.bar} />
      {level.days_per_week != null && (
        <Typography variant="caption" color="text.secondary">
          {S.workoutsHint(level.days_per_week)}
        </Typography>
      )}
      {level.uses_bodyweight ? (
        <Typography variant="caption" color="text.secondary">
          {S.bodyweightNote}
        </Typography>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary">
            {S.lifts(met, liftsNeeded)}
          </Typography>
          <LinearProgress variant="determinate" value={Math.min(100, (met / liftsNeeded) * 100)} sx={styles.bar} />
          {lifts.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              {S.noLiftsYet}
            </Typography>
          )}
          {lifts.map((lift) => (
            <Typography key={lift.pattern} variant="caption" sx={styles.liftRow(lift.met)}>
              {S.liftRow(S.patterns[lift.pattern] ?? lift.pattern, lift.ratio, lift.needed)}
            </Typography>
          ))}
        </>
      )}
    </Box>
  );
}

/**
 * Training suggestions from logged sets: an easy week when lifts stall, a
 * level change when consistency and strength are there, and the road to the
 * next level otherwise. Nothing changes until the user taps.
 */
export function TrainingCoachCard() {
  const progression = useProgression();
  const deload = useDeload();
  const levelUp = useLevelUp();
  const snooze = useSnoozeSuggestion();
  const data = progression.data;
  if (!data) return null;

  const level = data.level;
  const levelReady = Boolean(level?.ready && !level.snoozed && level.next_level);
  const showProgress = Boolean(level?.next_level) && !levelReady;
  if (!data.deload_until && !data.deload && !levelReady && !showProgress) return null;
  const busy = deload.start.isPending || deload.end.isPending || levelUp.isPending || snooze.isPending;

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    }
  };

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      <Stack sx={styles.stack}>
        {data.deload_until && (
          <Box sx={styles.callout('info')}>
            <Stack sx={styles.blockHead}>
              <IconBadge icon={SpaRounded} tone="info" />
              <Typography variant="body2">{S.deloadActive(formatDateLabel(data.deload_until))}</Typography>
            </Stack>
            <Button size="small" color="inherit" disabled={busy} onClick={() => run(() => deload.end.mutateAsync(), S.deloadEnded)}>
              {S.endDeload}
            </Button>
          </Box>
        )}

        {data.deload && (
          <Box sx={styles.callout('warning')}>
            <Stack sx={styles.blockHead}>
              <IconBadge icon={BatteryChargingFullRounded} tone="warning" />
              <Typography variant="subtitle2">{S.deloadTitle}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {S.deloadBody(data.deload.stalled_lifts)}
            </Typography>
            {data.deload.reasons.length > 0 && (
              <Box sx={styles.reasons}>
                <Typography variant="caption" sx={styles.reasonsTitle}>
                  {S.reasonsTitle}
                </Typography>
                {data.deload.reasons.map((reason) => (
                  <Typography key={reason.kind} variant="body2">
                    {reasonText(reason)}
                  </Typography>
                ))}
              </Box>
            )}
            <Stack sx={styles.actions}>
              <Button variant="contained" size="small" disabled={busy} onClick={() => run(() => deload.start.mutateAsync(), S.deloadStarted)}>
                {S.startDeload}
              </Button>
              <Button size="small" color="inherit" disabled={busy} onClick={() => snooze.mutate('deload')}>
                {S.notNow}
              </Button>
            </Stack>
          </Box>
        )}

        {levelReady && level?.next_level && (
          <Box sx={styles.callout('success')}>
            <Stack sx={styles.blockHead}>
              <IconBadge icon={MilitaryTechRounded} tone="success" />
              <Typography variant="subtitle2">{S.levelReadyTitle(levelName(level.next_level))}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {S.levelReadyBody}
            </Typography>
            <Stack sx={styles.actions}>
              <Button
                variant="contained"
                color="success"
                size="small"
                disabled={busy}
                onClick={() =>
                  run(() => levelUp.mutateAsync(), S.levelUpDone(levelName(level.next_level ?? '')))
                }
              >
                {S.levelUp(levelName(level.next_level))}
              </Button>
              <Button size="small" color="inherit" disabled={busy} onClick={() => snooze.mutate('level')}>
                {S.notNow}
              </Button>
            </Stack>
          </Box>
        )}

        {showProgress && level && <LevelProgress level={level} />}
      </Stack>
    </SectionCard>
  );
}
