import { useState, type KeyboardEvent } from 'react';
import { IconButton, Stack, TextField } from '@mui/material';
import { SendRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { inputBoxStyles as styles } from './InputBox.styles';

type InputBoxProps = {
  onSend: (content: string) => void;
  disabled?: boolean;
};

/** Message composer: multiline text field + send button. Enter sends, Shift+Enter breaks a line. */
export function InputBox({ onSend, disabled }: InputBoxProps) {
  const [value, setValue] = useState('');

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <Stack sx={styles.row}>
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={STRINGS.coach.inputPlaceholder}
        multiline
        maxRows={5}
        fullWidth
        disabled={disabled}
        sx={styles.field}
      />
      <IconButton
        aria-label={STRINGS.coach.sendAria}
        color="primary"
        onClick={handleSend}
        disabled={disabled || value.trim().length === 0}
        sx={styles.sendButton}
      >
        <SendRounded />
      </IconButton>
    </Stack>
  );
}
