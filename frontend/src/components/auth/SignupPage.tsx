import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { useAuth } from '../../hooks/useAuth';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { POST_AUTH_REDIRECT, ROUTES } from '../../constants/routes';
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from '../../utils/validation';
import { signupPageStyles as styles } from './SignupPage.styles';

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirmPassword: validateConfirmPassword(password, confirmPassword) ?? undefined,
    };
    setFieldErrors(errors);
    return !errors.email && !errors.password && !errors.confirmPassword;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Auto-login happens inside `signup` (register -> login).
      await signup({ email: email.trim(), password });
      navigate(POST_AUTH_REDIRECT, { replace: true });
    } catch (error) {
      setSubmitError(resolveApiError(error, STRINGS.errors.signupFailed));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={STRINGS.signup.title}
      subtitle={STRINGS.signup.subtitle}
      footer={
        <Typography variant="body2" color="text.secondary">
          {STRINGS.signup.switchPrompt}{' '}
          <MuiLink component={RouterLink} to={ROUTES.LOGIN} sx={styles.switchLink}>
            {STRINGS.signup.switchAction}
          </MuiLink>
        </Typography>
      }
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            label={STRINGS.fields.email}
            type="email"
            autoComplete="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
            disabled={isSubmitting}
          />

          <Box>
            <TextField
              label={STRINGS.fields.password}
              type="password"
              autoComplete="new-password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(fieldErrors.password)}
              helperText={fieldErrors.password}
              disabled={isSubmitting}
            />
            <PasswordStrengthMeter password={password} />
          </Box>

          <TextField
            label={STRINGS.fields.confirmPassword}
            type="password"
            autoComplete="new-password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={Boolean(fieldErrors.confirmPassword)}
            helperText={fieldErrors.confirmPassword}
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {isSubmitting ? STRINGS.signup.submitting : STRINGS.signup.submit}
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
