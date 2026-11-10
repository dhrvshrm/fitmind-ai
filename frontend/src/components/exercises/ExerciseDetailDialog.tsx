import type { ComponentType, ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  type SvgIconProps,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  AirRounded,
  CallMadeRounded,
  CallReceivedRounded,
  CancelRounded,
  CheckCircleRounded,
  CloseRounded,
  FitnessCenterRounded,
  HubRounded,
  PanToolRounded,
  PauseCircleOutlineRounded,
  SignalCellularAltRounded,
  StraightenRounded,
  TrackChangesRounded,
  VerifiedRounded,
} from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { useExerciseDetail } from '../../hooks/queries/useExerciseQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import type { ExerciseDetail, ExerciseSummary } from '../../types/exercise';
import { IconBadge } from '../ui/IconBadge';
import type { IconBadgeTone } from '../ui/IconBadge.styles';
import { ExerciseDemo } from './ExerciseDemo';
import { MuscleMap } from './MuscleMap';
import { exerciseDetailDialogStyles as styles } from './ExerciseDetailDialog.styles';

const S = STRINGS.exercises;
const D = S.detail;

type ExerciseDetailDialogProps = {
  exerciseId: string | null;
  onClose: () => void;
  /** Lets the easier and harder variations open in the same dialog. */
  onOpenExercise?: (id: string) => void;
};

type Fact = {
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<SvgIconProps>;
  tone: IconBadgeTone;
};

const FORCE_ICONS = { push: CallMadeRounded, pull: CallReceivedRounded, static: PauseCircleOutlineRounded };

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function factsFor(exercise: ExerciseDetail): Fact[] {
  const facts: Fact[] = [];
  if (exercise.force) {
    facts.push({ label: S.facts.force, value: S.force[exercise.force], hint: S.forceHint[exercise.force],
      icon: FORCE_ICONS[exercise.force], tone: 'primary' });
  }
  if (exercise.mechanic) {
    facts.push({ label: S.facts.mechanic, value: S.mechanic[exercise.mechanic], hint: S.mechanicHint[exercise.mechanic],
      icon: HubRounded, tone: 'info' });
  }
  facts.push({ label: S.facts.level, value: S.level[exercise.level], hint: S.levelHint[exercise.level],
    icon: SignalCellularAltRounded, tone: 'success' });
  facts.push({ label: S.facts.equipment, value: exercise.equipment ? capitalize(exercise.equipment) : S.equipmentNone,
    hint: S.equipmentHint, icon: FitnessCenterRounded, tone: 'warning' });
  return facts;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="subtitle1" component="h3" sx={styles.sectionTitle}>
      {children}
    </Typography>
  );
}

function FactTiles({ exercise }: { exercise: ExerciseDetail }) {
  return (
    <Box sx={styles.facts}>
      {factsFor(exercise).map((fact) => (
        <Paper key={fact.label} variant="outlined" sx={styles.fact}>
          <IconBadge icon={fact.icon} tone={fact.tone} size="small" />
          <Box sx={styles.factText}>
            <Typography variant="caption" color="text.secondary" sx={styles.factLabel}>
              {fact.label}
            </Typography>
            <Typography variant="subtitle1" sx={styles.factValue}>
              {fact.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fact.hint}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <Box component="ol" sx={styles.steps}>
      {items.map((item, index) => (
        <Box component="li" key={item} sx={styles.step}>
          <Box sx={styles.stepNumber}>{index + 1}</Box>
          <Typography variant="body1">{item}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function SetupItem({ icon: Icon, label, text }: { icon: ComponentType<SvgIconProps>; label: string; text: string }) {
  return (
    <Stack sx={styles.setupItem}>
      <Icon color="primary" sx={styles.setupIcon} />
      <Box>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      </Box>
    </Stack>
  );
}

function CheckList({ title, items, good }: { title: string; items: string[]; good: boolean }) {
  const Icon = good ? CheckCircleRounded : CancelRounded;
  return (
    <Paper variant="outlined" sx={styles.checkPanel(good)}>
      <SectionTitle>{title}</SectionTitle>
      <Stack component="ul" sx={styles.checkList}>
        {items.map((item) => (
          <Stack component="li" key={item} sx={styles.checkItem}>
            <Icon fontSize="small" color={good ? 'success' : 'error'} sx={styles.checkIcon} />
            <Typography variant="body2">{item}</Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function SourceNote({ exercise }: { exercise: ExerciseDetail }) {
  return (
    <>
      {exercise.coaching && (
        <Typography variant="caption" color="text.secondary" component="p">
          {exercise.coaching.reviewed ? D.reviewed : D.draft}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" component="p">
        {D.source(exercise.source)}
      </Typography>
    </>
  );
}

function VariationCard({ label, exercise, onOpen }: { label: string; exercise: ExerciseSummary | null; onOpen?: (id: string) => void }) {
  if (!exercise) return null;
  return (
    <ButtonBase
      onClick={() => onOpen?.(exercise.id)}
      disabled={!onOpen}
      aria-label={D.openVariation(exercise.name)}
      sx={styles.variation}
    >
      {exercise.image && <Box component="img" src={exercise.image} alt="" loading="lazy" sx={styles.variationImage} />}
      <Box sx={styles.variationText}>
        <Typography variant="caption" color="text.secondary" sx={styles.factLabel}>
          {label}
        </Typography>
        <Typography variant="subtitle2">{exercise.name}</Typography>
      </Box>
    </ButtonBase>
  );
}

/**
 * Everything about one exercise: the movement, what it is (force, type,
 * level, equipment), muscles worked on a body diagram, setup, steps, form
 * cues, common mistakes, breathing and variations, with the data source.
 */
export function ExerciseDetailDialog({ exerciseId, onClose, onOpenExercise }: ExerciseDetailDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const detail = useExerciseDetail(exerciseId);
  const error = queryErrorMessage(detail.error, D.loadError);
  const exercise = detail.data;
  const coaching = exercise?.coaching;
  const targets = exercise?.primary_muscles.map((m) => S.muscles[m] ?? m).join(', ');

  return (
    <Dialog
      open={Boolean(exerciseId)}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
      scroll="paper"
      slotProps={{ paper: { sx: styles.paper } }}
    >
      <Stack sx={styles.header}>
        <Box sx={styles.headerText}>
          <Typography variant="h5" component="h2" sx={styles.title}>
            {exercise?.name ?? <Skeleton width={260} />}
          </Typography>
          {exercise && (
            <Stack sx={styles.headerMeta}>
              {targets && (
                <Stack sx={styles.targets}>
                  <TrackChangesRounded fontSize="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    {D.targets(targets)}
                  </Typography>
                </Stack>
              )}
              {coaching && (
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  icon={<VerifiedRounded />}
                  label={coaching.reviewed ? D.reviewedBadge : D.coachedBadge}
                />
              )}
            </Stack>
          )}
        </Box>
        <IconButton aria-label={D.close} onClick={onClose} sx={styles.close}>
          <CloseRounded />
        </IconButton>
      </Stack>

      <DialogContent dividers sx={styles.content}>
        {detail.isPending && (
          <Box sx={styles.topGrid}>
            <Skeleton variant="rounded" sx={styles.skeleton} />
            <Skeleton variant="rounded" sx={styles.skeleton} />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}

        {exercise && (
          <Stack sx={styles.body}>
            <FactTiles exercise={exercise} />

            <Box sx={styles.topGrid}>
              <ExerciseDemo name={exercise.name} images={exercise.images} videoUrl={coaching?.video_url ?? null} />
              <Paper variant="outlined" sx={styles.panel}>
                <SectionTitle>{D.muscles}</SectionTitle>
                <MuscleMap
                  primary={exercise.primary_muscles}
                  secondary={exercise.secondary_muscles}
                  stabilizers={exercise.stabilizers}
                  showStabilizers={Boolean(coaching)}
                />
              </Paper>
            </Box>

            {coaching ? (
              <>
                <Box sx={styles.howGrid}>
                  <Box>
                    <SectionTitle>{D.steps}</SectionTitle>
                    <Steps items={coaching.steps} />
                  </Box>
                  <Paper variant="outlined" sx={styles.panel}>
                    <SectionTitle>{D.setup}</SectionTitle>
                    <Stack sx={styles.setupList}>
                      <SetupItem icon={PanToolRounded} label={D.grip} text={coaching.grip} />
                      <SetupItem icon={StraightenRounded} label={D.stance} text={coaching.stance} />
                      <SetupItem icon={AirRounded} label={D.breathing} text={coaching.breathing} />
                    </Stack>
                  </Paper>
                </Box>

                <Box sx={styles.twoColumns}>
                  <CheckList title={D.cues} items={coaching.cues} good />
                  <CheckList title={D.mistakes} items={coaching.mistakes} good={false} />
                </Box>

                {(exercise.easier || exercise.harder) && (
                  <Box>
                    <SectionTitle>{D.variations}</SectionTitle>
                    <Box sx={styles.twoColumns}>
                      <VariationCard label={D.easier} exercise={exercise.easier} onOpen={onOpenExercise} />
                      <VariationCard label={D.harder} exercise={exercise.harder} onOpen={onOpenExercise} />
                    </Box>
                  </Box>
                )}
              </>
            ) : (
              <>
                <Alert severity="info" variant="outlined">
                  {D.noCoaching}
                </Alert>
                <Box>
                  <SectionTitle>{D.instructions}</SectionTitle>
                  <Steps items={exercise.instructions} />
                </Box>
              </>
            )}

            {/* On phones the note sits here so the footer stays small. */}
            <Box sx={styles.sourceInline}>
              <SourceNote exercise={exercise} />
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={styles.actions}>
        <Box sx={styles.sourceNote}>{exercise && <SourceNote exercise={exercise} />}</Box>
        <Button variant="contained" onClick={onClose}>
          {D.close}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
