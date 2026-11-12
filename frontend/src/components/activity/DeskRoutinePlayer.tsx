import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  CheckCircleRounded,
  CloseRounded,
  InfoOutlined,
  PauseRounded,
  PlayArrowRounded,
  SkipNextRounded,
  SkipPreviousRounded,
} from '@mui/icons-material';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import type { DeskRoutine } from '../../types/activity';
import { ExerciseDemo } from '../exercises/ExerciseDemo';
import { ExerciseDetailDialog } from '../exercises/ExerciseDetailDialog';
import { deskRoutinePlayerStyles as styles } from './DeskRoutinePlayer.styles';

const P = ACTIVITY_STRINGS.player;

type DeskRoutinePlayerProps = {
  routine: DeskRoutine;
  onClose: () => void;
};

/** Seconds since routine start at which each step begins. */
function stepStarts(routine: DeskRoutine): number[] {
  const starts: number[] = [];
  let total = 0;
  for (const step of routine.steps) {
    starts.push(total);
    total += step.seconds;
  }
  return starts;
}

/**
 * Guided timer for a desk routine. One clock runs for the whole routine (the
 * workout timer); the current move is worked out from it, and skipping or
 * going back just shifts the position, so the screen never gets out of step.
 */
export function DeskRoutinePlayer({ routine, onClose }: DeskRoutinePlayerProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const timer = useWorkoutTimer();
  const [shift, setShift] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);

  const starts = stepStarts(routine);
  const total = routine.total_seconds;
  const started = timer.status !== 'idle';
  const position = Math.max(0, timer.seconds + shift);
  const done = started && position >= total;
  let index = 0;
  for (let i = 0; i < starts.length; i += 1) if (starts[i] <= position) index = i;
  const step = routine.steps[index];
  const elapsed = Math.min(position - starts[index], step?.seconds ?? 0);
  const remaining = Math.max(0, (step?.seconds ?? 0) - elapsed);
  const next = routine.steps[index + 1];

  function start() {
    setShift(0);
    timer.start();
  }

  function skip() {
    setShift((s) => s + remaining);
  }

  function previous() {
    const back = elapsed > 3 || index === 0 ? elapsed : elapsed + routine.steps[index - 1].seconds;
    setShift((s) => s - back);
  }

  function openDetails(id: string) {
    if (timer.status === 'running') timer.pause();
    setDetailId(id);
  }

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle sx={styles.title}>
        <Box>
          <Typography variant="h6" component="span">
            {routine.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {routine.description}
          </Typography>
        </Box>
        <IconButton aria-label={P.close} onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {!started && (
          <Box>
            <Typography variant="subtitle2">{P.overview}</Typography>
            <List dense>
              {routine.steps.map((s, i) => (
                <ListItem
                  key={`${s.exercise_id}-${i}`}
                  disableGutters
                  secondaryAction={
                    <IconButton edge="end" aria-label={P.howTo} onClick={() => openDetails(s.exercise_id)}>
                      <InfoOutlined />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar variant="rounded" src={s.image ?? undefined} alt="" sx={styles.thumb} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={s.name}
                    secondary={s.per_side ? P.perSide(s.seconds) : P.seconds(s.seconds)}
                  />
                </ListItem>
              ))}
            </List>
            <Typography variant="caption" color="text.secondary">
              {P.gentle}
            </Typography>
          </Box>
        )}

        {started && !done && step && (
          <Box>
            <Stack sx={styles.stepHeader}>
              <Typography variant="overline" color="text.secondary">
                {P.step(index + 1, routine.steps.length)}
              </Typography>
              <Button size="small" startIcon={<InfoOutlined />} onClick={() => openDetails(step.exercise_id)}>
                {P.howTo}
              </Button>
            </Stack>
            <Typography variant="h5" component="h2" sx={styles.stepName}>
              {step.name}
            </Typography>
            <ExerciseDemo key={step.exercise_id + index} name={step.name} images={step.images} videoUrl={null} />
            <Box sx={styles.clock} aria-live="polite">
              <Typography variant="h2" component="p" sx={styles.clockNumber}>
                {remaining}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {P.remaining}
              </Typography>
            </Box>
            {step.per_side && (
              <Typography variant="subtitle2" color="primary" sx={styles.side}>
                {elapsed >= step.seconds / 2 ? P.switchSides : P.firstSide}
              </Typography>
            )}
            <LinearProgress
              variant="determinate"
              value={step.seconds > 0 ? (elapsed / step.seconds) * 100 : 0}
              sx={styles.progress}
            />
            {step.cue && (
              <Typography variant="body2" sx={styles.cue}>
                {step.cue}
              </Typography>
            )}
            {next && (
              <Typography variant="caption" color="text.secondary">
                {P.upNext(next.name)}
              </Typography>
            )}
          </Box>
        )}

        {done && (
          <Stack sx={styles.done}>
            <CheckCircleRounded color="success" sx={styles.doneIcon} />
            <Typography variant="h6">{P.doneTitle}</Typography>
            <Typography variant="body2" color="text.secondary">
              {P.doneBody}
            </Typography>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={styles.actions}>
        {!started && (
          <Button variant="contained" startIcon={<PlayArrowRounded />} onClick={start} fullWidth={fullScreen}>
            {P.start}
          </Button>
        )}
        {started && !done && (
          <>
            <IconButton aria-label={P.previous} onClick={previous}>
              <SkipPreviousRounded />
            </IconButton>
            <Button
              variant="contained"
              startIcon={timer.status === 'running' ? <PauseRounded /> : <PlayArrowRounded />}
              onClick={timer.status === 'running' ? timer.pause : timer.resume}
            >
              {timer.status === 'running' ? P.pause : P.resume}
            </Button>
            <IconButton aria-label={P.next} onClick={skip}>
              <SkipNextRounded />
            </IconButton>
          </>
        )}
        {done && (
          <Button variant="contained" onClick={onClose}>
            {P.close}
          </Button>
        )}
      </DialogActions>

      <ExerciseDetailDialog exerciseId={detailId} onClose={() => setDetailId(null)} />
    </Dialog>
  );
}
