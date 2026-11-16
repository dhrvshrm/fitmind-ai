import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { DeleteOutlineRounded, LockRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { HEALTH_STRINGS } from '../../constants/healthStrings';
import { useWithdrawConsent } from '../../hooks/queries/useHealthQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { ConsentScope } from '../../types/health';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SectionCard } from '../ui/SectionCard';
import { privacyCardStyles as styles } from './PrivacyCard.styles';

type PrivacyCardProps = {
  grantedAt: string | null;
  /** Which consent this card withdraws. */
  scope?: ConsentScope;
  /** Its wording (the health profile's by default). */
  strings?: typeof HEALTH_STRINGS.privacy;
};

/** When consent was given, and the way to withdraw it (which deletes the data). */
export function PrivacyCard({
  grantedAt,
  scope = 'health_profile',
  strings: S = HEALTH_STRINGS.privacy,
}: PrivacyCardProps) {
  const withdraw = useWithdrawConsent();
  const [confirming, setConfirming] = useState(false);

  async function handleWithdraw() {
    try {
      await withdraw.mutateAsync(scope);
      setConfirming(false);
      toast.success(S.withdrawn);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <SectionCard title={S.title}>
      <Box sx={styles.row}>
        <LockRounded fontSize="small" sx={styles.icon} />
        <Typography variant="body2" color="text.secondary">
          {grantedAt ? S.granted(grantedAt) : null}
        </Typography>
      </Box>
      <Button
        color="error"
        variant="outlined"
        startIcon={<DeleteOutlineRounded />}
        onClick={() => setConfirming(true)}
        sx={styles.withdraw}
      >
        {S.withdraw}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={S.withdrawTitle}
        description={S.withdrawBody}
        confirmLabel={S.withdraw}
        destructive
        loading={withdraw.isPending}
        onConfirm={handleWithdraw}
        onClose={() => setConfirming(false)}
      />
    </SectionCard>
  );
}
