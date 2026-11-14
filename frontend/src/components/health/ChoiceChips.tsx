import { Box, Chip, Typography } from '@mui/material';
import { choiceChipsStyles as styles } from './ChoiceChips.styles';

type ChoiceChipsProps<T extends string | boolean> = {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  /** Called with `undefined` when the chosen chip is tapped again. */
  onChange: (value: T | undefined) => void;
};

/** A question with its answers as chips; tapping the chosen one clears it. */
export function ChoiceChips<T extends string | boolean>({ label, options, value, onChange }: ChoiceChipsProps<T>) {
  return (
    <Box role="group" aria-label={label} sx={styles.root}>
      <Typography variant="body2" sx={styles.label}>
        {label}
      </Typography>
      <Box sx={styles.chips}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Chip
              key={String(option.value)}
              label={option.label}
              size="small"
              clickable
              aria-pressed={selected}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => onChange(selected ? undefined : option.value)}
            />
          );
        })}
      </Box>
    </Box>
  );
}
