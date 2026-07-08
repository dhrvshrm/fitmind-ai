import { useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import {
  LockOutlined,
  VisibilityOffOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
};

/**
 * Password input with a lock icon and a show/hide visibility toggle.
 * Shared by the login and signup forms.
 */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  error,
  helperText,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      label={label}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      helperText={helperText}
      disabled={disabled}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <LockOutlined fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={
                  visible ? STRINGS.aria.hidePassword : STRINGS.aria.showPassword
                }
                onClick={() => setVisible((v) => !v)}
                edge="end"
                size="small"
              >
                {visible ? (
                  <VisibilityOffOutlined fontSize="small" />
                ) : (
                  <VisibilityOutlined fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
