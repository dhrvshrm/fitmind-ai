import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { STRINGS } from '../constants/strings';
import { ROUTES } from '../constants/routes';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

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
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card elevation={4} sx={{ width: '100%', maxWidth: 480, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2} sx={{ textAlign: 'center' }}>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
              {STRINGS.app.name}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
            {user?.email && (
              <Typography variant="body2">
                Signed in as <strong>{user.email}</strong>
              </Typography>
            )}
            <Button variant="outlined" color="primary" onClick={handleLogout}>
              Log out
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
