import { Box, LinearProgress, Typography } from '@mui/material';
import { AnimatedNumber } from './AnimatedNumber';
import { progressRowStyles as styles } from './ProgressRow.styles';

type ProgressRowProps = {
  label: string;
  value: number;
  goal: number;
  unit: string;
  /** Bar color; defaults to the brand color. */
  color?: string;
};

/** "Protein 82 / 120 g" with a bar; the bar caps at full when over goal. */
export function ProgressRow({ label, value, goal, unit, color }: ProgressRowProps) {
  const percent = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <Box>
      <Box sx={styles.labels}>
        <Typography variant="body2" sx={styles.label}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={styles.numbers}>
          <AnimatedNumber value={value} /> / {Math.round(goal)} {unit}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={percent} sx={styles.bar(color)} />
    </Box>
  );
}
