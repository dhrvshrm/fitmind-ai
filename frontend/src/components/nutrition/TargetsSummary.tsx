import { Alert, Box, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import type { Targets } from '../../types/onboarding';
import { targetsSummaryStyles as styles } from './TargetsSummary.styles';

const S = STRINGS.targets;

type NoteKey = keyof typeof S.notes;
type FlagKey = keyof typeof S.flags;

type TargetsSummaryProps = {
  targets: Targets;
  /** Show the step-by-step explanation under the numbers. */
  showExplanation?: boolean;
};

/** Daily targets as a compact grid, with the reasoning and any safety notes. */
export function TargetsSummary({ targets, showExplanation = true }: TargetsSummaryProps) {
  const tiles = [
    { label: S.labels.calories, value: S.values.kcal(targets.calories) },
    { label: S.labels.protein, value: S.values.grams(targets.protein) },
    { label: S.labels.carbs, value: S.values.grams(targets.carbs) },
    { label: S.labels.fats, value: S.values.grams(targets.fats) },
    { label: S.labels.fiber, value: S.values.grams(targets.fiber) },
    { label: S.labels.water, value: S.values.liters(targets.water_ml) },
  ];
  const explanation = targets.notes
    .filter((note) => note.code in S.notes)
    .map((note) => S.notes[note.code as NoteKey](note.values));
  const flagMessages = targets.flags
    .filter((flag) => flag in S.flags)
    .map((flag) => ({ flag, text: S.flags[flag as FlagKey] }));

  return (
    <Stack sx={styles.root}>
      <Box sx={styles.grid}>
        {tiles.map((tile) => (
          <Box key={tile.label} sx={styles.tile}>
            <Typography variant="caption" color="text.secondary">
              {tile.label}
            </Typography>
            <Typography variant="h6" component="p" sx={styles.value}>
              {tile.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {flagMessages.map(({ flag, text }) => (
        <Alert key={flag} severity={flag.startsWith('no_deficit') ? 'warning' : 'info'} variant="outlined">
          {text}
        </Alert>
      ))}

      {showExplanation && (
        <Box>
          <Typography variant="subtitle2" sx={styles.howTitle}>
            {S.howTitle}
          </Typography>
          <Box component="ol" sx={styles.steps}>
            {explanation.map((line) => (
              <Typography key={line} component="li" variant="body2" color="text.secondary">
                {line}
              </Typography>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {S.disclaimer}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
