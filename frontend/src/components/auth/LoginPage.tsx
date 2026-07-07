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
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { POST_AUTH_REDIRECT, ROUTES } from '../../constants/routes';
import { validateEmail, validatePassword } from '../../utils/validation';

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Where to send the user after login: back to their intended page, or onboarding. */
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    POST_AUTH_REDIRECT;

  function validate(): boolean {
    const errors: FieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
    };
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(resolveApiError(error, STRINGS.errors.loginFailed));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={STRINGS.login.title}
      subtitle={STRINGS.login.subtitle}
      footer={
        <Typography variant="body2" color="text.secondary">
          {STRINGS.login.switchPrompt}{' '}
          <MuiLink component={RouterLink} to={ROUTES.SIGNUP} sx={{ fontWeight: 600 }}>
            {STRINGS.login.switchAction}
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

          <TextField
            label={STRINGS.fields.password}
            type="password"
            autoComplete="current-password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
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
            {isSubmitting ? STRINGS.login.submitting : STRINGS.login.submit}
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
