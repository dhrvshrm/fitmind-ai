import { Box, Chip, Typography } from '@mui/material';
import type { ChipOption } from '../../constants/onboarding';
import { choiceChipsStyles as styles } from './ChoiceChips.styles';

type Value = string | number | boolean;

type SingleProps<T extends Value> = {
  multiple?: false;
  value: T | '' | undefined;
  /** Called with the picked value, or `undefined` when the selected chip is tapped again. */
  onChange: (value: T | undefined) => void;
};

type MultipleProps<T extends Value> = {
  multiple: true;
  value: T[] | undefined;
  onChange: (value: T[]) => void;
};

type ChoiceChipsProps<T extends Value> = (SingleProps<T> | MultipleProps<T>) & {
  label: string;
  options: ChipOption<T>[];
  error?: string;
};

/**
 * A labelled row of chips for quick answers. Single-choice chips can be
 * tapped again to clear the answer, so every question stays skippable.
 */
export function ChoiceChips<T extends Value>(props: ChoiceChipsProps<T>) {
  const { label, options, error } = props;

  function isSelected(option: T): boolean {
    return props.multiple ? (props.value ?? []).includes(option) : props.value === option;
  }

  function toggle(option: T) {
    if (props.multiple) {
      const current = props.value ?? [];
      props.onChange(current.includes(option) ? current.filter((v) => v !== option) : [...current, option]);
    } else {
      props.onChange(props.value === option ? undefined : option);
    }
  }

  return (
    <Box role="group" aria-label={label}>
      <Typography variant="subtitle2" sx={styles.label}>
        {label}
      </Typography>
      <Box sx={styles.chips}>
        {options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <Chip
              key={String(option.value)}
              label={option.label}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => toggle(option.value)}
              aria-pressed={selected}
            />
          );
        })}
      </Box>
      {error && (
        <Typography variant="caption" color="error" sx={styles.error}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
