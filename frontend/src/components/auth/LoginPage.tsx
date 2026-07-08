import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowForwardRounded, EmailOutlined } from '@mui/icons-material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { useAuth } from '../../hooks/useAuth';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { POST_AUTH_REDIRECT, ROUTES } from '../../constants/routes';
import { validateEmail, validatePassword } from '../../utils/validation';
import { loginPageStyles as styles } from './LoginPage.styles';

type FieldErrors = {
  email?: string;
  password?: string;
};

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
          <MuiLink component={RouterLink} to={ROUTES.SIGNUP} sx={styles.switchLink}>
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
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <PasswordField
            label={STRINGS.fields.password}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
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
            endIcon={isSubmitting ? null : <ArrowForwardRounded />}
          >
            {isSubmitting ? STRINGS.login.submitting : STRINGS.login.submit}
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
