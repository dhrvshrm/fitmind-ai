import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { STRINGS } from '../constants/strings';
import { ROUTES } from '../constants/routes';
import { placeholderPageStyles as styles } from './PlaceholderPage.styles';

type PlaceholderPageProps = {
  title: string;
  description: string;
};

/**
 * Temporary landing page for protected routes (onboarding/dashboard) until their
 * real screens are built. Shows the signed-in user and a working logout.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <Box sx={styles.root}>
      <Card elevation={4} sx={styles.card}>
        <CardContent sx={styles.content}>
          <Stack spacing={2} sx={styles.stack}>
            <Typography variant="overline" color="primary" sx={styles.brand}>
              {STRINGS.app.name}
            </Typography>
            <Typography variant="h5" sx={styles.title}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
            {user?.email && (
              <Typography variant="body2">
                {STRINGS.placeholder.signedInAs} <strong>{user.email}</strong>
              </Typography>
            )}
            <Button variant="outlined" color="primary" onClick={handleLogout}>
              {STRINGS.placeholder.logout}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
