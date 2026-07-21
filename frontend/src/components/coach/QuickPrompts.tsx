import { Chip, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { QUICK_PROMPTS } from '../../constants/chat';
import { quickPromptsStyles as styles } from './QuickPrompts.styles';

type QuickPromptsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

/** Suggestion chips for common questions; clicking one sends it as a message. */
export function QuickPrompts({ onSelect, disabled }: QuickPromptsProps) {
  return (
    <Stack sx={styles.root}>
      <Typography variant="caption" color="text.secondary" sx={styles.label}>
        {STRINGS.coach.quickPrompts.title}
      </Typography>
      <Stack sx={styles.row}>
        {QUICK_PROMPTS.map((prompt) => (
          <Chip
            key={prompt}
            label={prompt}
            variant="outlined"
            color="primary"
            clickable={!disabled}
            disabled={disabled}
            onClick={() => onSelect(prompt)}
          />
        ))}
      </Stack>
    </Stack>
  );
}
