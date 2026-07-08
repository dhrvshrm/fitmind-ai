import { Box, Paper, Stack, Typography } from '@mui/material';
import type { Option } from '../../constants/onboarding';
import { optionSelectorStyles as styles } from './OptionSelector.styles';

type OptionSelectorProps<T extends string> = {
  options: Option<T>[];
  /** Currently selected value(s). String for single-select, array for multi. */
  value: T | '' | T[];
  onChange: (value: T) => void;
  /** When true, clicking toggles membership in an array (multi-select). */
  multiple?: boolean;
  /** Responsive column count; defaults to a 1/2-up grid. */
  columns?: number;
};

/**
 * Reusable card grid for picking one or many options. Shared by the gender,
 * goal, experience, and equipment steps so their look and behavior stay in sync.
 */
export function OptionSelector<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
  columns = 2,
}: OptionSelectorProps<T>) {
  const isSelected = (optionValue: T) =>
    multiple ? (value as T[]).includes(optionValue) : value === optionValue;

  return (
    <Box sx={styles.grid(columns)}>
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <Paper
            key={option.value}
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={selected}
            tabIndex={0}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(option.value);
              }
            }}
            elevation={0}
            sx={styles.card(selected)}
          >
            <Typography component="span" sx={styles.icon}>
              {option.icon}
            </Typography>
            <Stack spacing={0.25}>
              <Typography sx={styles.label}>{option.label}</Typography>
              {option.description && (
                <Typography variant="body2" sx={styles.description(selected)}>
                  {option.description}
                </Typography>
              )}
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
}
