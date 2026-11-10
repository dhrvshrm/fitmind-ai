import { useDeferredValue, useState } from 'react';
import {
  Box,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { SearchOffRounded, VerifiedRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { MUSCLE_GROUPS } from '../../constants/exercises';
import { useExerciseSearch } from '../../hooks/queries/useExerciseQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import type { MuscleGroup } from '../../types/exercise';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { ExerciseDetailDialog } from './ExerciseDetailDialog';
import { exerciseLibraryStyles as styles } from './ExerciseLibrary.styles';

const S = STRINGS.exercises;
const SKELETON_COUNT = 8;

/** Browse and search the exercise catalogue; any exercise opens its detail page. */
export function ExerciseLibrary() {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [curatedOnly, setCuratedOnly] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const search = useExerciseSearch(deferredQuery, muscle, curatedOnly);
  const error = queryErrorMessage(search.error, S.library.error);
  const results = search.data?.exercises ?? [];

  return (
    <SectionCard title={STRINGS.workout.tabs.library} subtitle={S.library.subtitle}>
      <Stack sx={styles.filters}>
        <TextField
          size="small"
          label={S.library.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={styles.search}
        />
        <TextField
          select
          size="small"
          label={S.library.muscle}
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as MuscleGroup | '')}
          sx={styles.muscle}
        >
          <MenuItem value="">{S.library.allMuscles}</MenuItem>
          {MUSCLE_GROUPS.map((group) => (
            <MenuItem key={group} value={group}>
              {S.muscles[group]}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={<Switch checked={curatedOnly} onChange={(e) => setCuratedOnly(e.target.checked)} />}
          label={S.library.curatedOnly}
        />
      </Stack>

      {error && <ErrorState message={error} onRetry={() => search.refetch()} />}

      <Box sx={styles.grid}>
        {search.isPending &&
          Array.from({ length: SKELETON_COUNT }, (_, i) => <Skeleton key={i} variant="rounded" sx={styles.skeleton} />)}
        {results.map((exercise) => (
          <Paper
            key={exercise.id}
            variant="outlined"
            role="button"
            tabIndex={0}
            onClick={() => setOpenId(exercise.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpenId(exercise.id);
              }
            }}
            sx={styles.card}
          >
            {exercise.image && (
              <Box component="img" src={exercise.image} alt="" loading="lazy" sx={styles.thumb} />
            )}
            <Box sx={styles.cardText}>
              <Typography variant="body2" sx={styles.name}>
                {exercise.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {exercise.primary_muscles.map((m) => S.muscles[m] ?? m).join(', ')}
              </Typography>
              {exercise.curated && (
                <Chip size="small" icon={<VerifiedRounded />} label={S.library.coached} color="success" variant="outlined" sx={styles.chip} />
              )}
            </Box>
          </Paper>
        ))}
      </Box>

      {search.isSuccess && results.length === 0 && (
        <EmptyState icon={SearchOffRounded} title={S.library.empty} compact />
      )}

      <ExerciseDetailDialog exerciseId={openId} onClose={() => setOpenId(null)} onOpenExercise={setOpenId} />
    </SectionCard>
  );
}
