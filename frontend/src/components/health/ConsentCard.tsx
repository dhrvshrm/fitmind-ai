import { Box, Button, Card, CircularProgress, Typography } from '@mui/material';
import {
  ArrowForwardRounded,
  Inventory2Rounded,
  LockRounded,
  TuneRounded,
  UndoRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { HEALTH_STRINGS } from '../../constants/healthStrings';
import { useGrantConsent } from '../../hooks/queries/useHealthQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { ConsentScope } from '../../types/health';
import { consentCardStyles as styles } from './ConsentCard.styles';

const POINT_ICONS = [Inventory2Rounded, TuneRounded, LockRounded, UndoRounded];

type ConsentCardProps = {
  /** Which kind of health data this consent covers. */
  scope?: ConsentScope;
  /** Its wording (the health profile's by default). */
  strings?: typeof HEALTH_STRINGS.consent;
};

/** Plain-language consent, asked once before any health detail is stored. */
export function ConsentCard({ scope = 'health_profile', strings: S = HEALTH_STRINGS.consent }: ConsentCardProps) {
  const grant = useGrantConsent();

  async function handleAgree() {
    try {
      await grant.mutateAsync(scope);
      toast.success(S.agreed);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Card sx={styles.card}>
      <Typography sx={styles.eyebrow}>{S.eyebrow}</Typography>
      <Typography variant="h5" component="h2" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography color="text.secondary" sx={styles.intro}>
        {S.intro}
      </Typography>

      <Box component="ol" sx={styles.points}>
        {S.points.map((point, index) => {
          const Icon = POINT_ICONS[index];
          return (
            <Box component="li" key={point.title} sx={styles.point}>
              <Box sx={styles.pointIcon}>
                <Icon fontSize="small" />
              </Box>
              <Box>
                <Typography sx={styles.pointTitle}>{point.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {point.body}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={handleAgree}
        disabled={grant.isPending}
        endIcon={grant.isPending ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardRounded />}
        sx={styles.agree}
      >
        {grant.isPending ? S.agreeing : S.agree}
      </Button>
    </Card>
  );
}
