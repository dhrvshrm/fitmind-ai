import { Box, Button, Checkbox, IconButton, Link, Paper, Stack, Typography } from '@mui/material';
import {
  FitnessCenterRounded,
  InfoOutlined,
  PlayCircleOutlineRounded,
  SpeedRounded,
  SwapHorizRounded,
} from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { splitReps } from '../../utils/workout';
import type { Exercise } from '../../types/workout';
import { exerciseCardStyles as styles } from './ExerciseCard.styles';

const S = STRINGS.workout.exercise;
const M = STRINGS.exercises.muscles;

type ExerciseCardProps = {
  exercise: Exercise;
  /** When provided, renders a completion checkbox. */
  checked?: boolean;
  onToggle?: () => void;
  /** Opens the exercise's detail page (catalogue exercises only). */
  onDetails?: () => void;
  /** Opens the swap dialog (weekly plan only). */
  onSwap?: () => void;
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Box sx={styles.stat}>
      <Typography variant="subtitle1" component="span" sx={styles.statValue}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

/** One planned exercise: photo, sets, reps and rest, muscles worked, and how-to or swap actions. */
export function ExerciseCard({ exercise, checked = false, onToggle, onDetails, onSwap }: ExerciseCardProps) {
  const done = Boolean(onToggle) && checked;
  const reps = splitReps(exercise.reps);
  const repsLabel = reps.timed
    ? reps.eachSide ? S.statTimeEachSide : S.statTime
    : reps.eachSide ? S.statRepsEachSide : S.statReps;
  const muscles = (exercise.primary_muscles ?? []).map((m) => M[m] ?? m).join(', ');
  const canDetail = Boolean(onDetails && exercise.exercise_id);
  const canSwap = Boolean(onSwap && exercise.exercise_id);

  return (
    <Paper variant="outlined" sx={styles.card(done)}>
      {onToggle && (
        <Checkbox
          checked={checked}
          onChange={onToggle}
          slotProps={{ input: { 'aria-label': S.doneAria(exercise.name) } }}
        />
      )}

      {exercise.image ? (
        <Box component="img" src={exercise.image} alt="" loading="lazy" sx={styles.thumb} />
      ) : (
        <Box sx={styles.thumbPlaceholder}>
          <FitnessCenterRounded color="disabled" />
        </Box>
      )}

      <Box sx={styles.body}>
        <Stack sx={styles.titleRow}>
          <Typography variant="subtitle1" component="h4" sx={styles.name(done)}>
            {exercise.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={styles.level}>
            {exercise.difficulty}
          </Typography>
        </Stack>
        {muscles && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {muscles}
          </Typography>
        )}

        <Stack sx={styles.stats}>
          <Stat value={String(exercise.sets)} label={S.statSets(exercise.sets)} />
          <Box sx={styles.divider} />
          <Stat value={reps.value} label={repsLabel} />
          <Box sx={styles.divider} />
          <Stat value={exercise.rest} label={S.statRest} />
        </Stack>

        {exercise.effort && (
          <Stack sx={styles.effort}>
            <SpeedRounded fontSize="inherit" />
            <Typography variant="caption">{exercise.effort}</Typography>
          </Stack>
        )}
      </Box>

      {(canDetail || canSwap || exercise.video_url) && (
        <Stack sx={styles.actions}>
          {canDetail && (
            <Button size="small" startIcon={<InfoOutlined />} onClick={onDetails} aria-label={S.detailsAria(exercise.name)}>
              {S.howTo}
            </Button>
          )}
          {canSwap && (
            <Button size="small" color="inherit" startIcon={<SwapHorizRounded />} onClick={onSwap} aria-label={S.swapAria(exercise.name)}>
              {S.swap}
            </Button>
          )}
          {exercise.video_url && (
            <IconButton component={Link} href={exercise.video_url} target="_blank" rel="noopener" aria-label={S.videoAria} color="primary">
              <PlayCircleOutlineRounded />
            </IconButton>
          )}
        </Stack>
      )}
    </Paper>
  );
}
