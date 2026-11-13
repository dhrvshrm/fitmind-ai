import { useState } from 'react';
import { Box, Button, Chip, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { AddRounded, CloseRounded, DarkModeRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { INDIA_FIRST_STRINGS } from '../../constants/indiaFirstStrings';
import { useFastingModes, useRemoveFastingMode } from '../../hooks/queries/useDietPlanQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import { formatDateLabel } from '../../utils/date';
import { modeName } from '../../utils/mealPlan';
import type { FastingMode } from '../../types/indiaFirst';
import { ErrorState } from '../ui/ErrorState';
import { IconBadge } from '../ui/IconBadge';
import { SectionCard } from '../ui/SectionCard';
import { FastingModeDialog } from './FastingModeDialog';
import { fastingModesCardStyles as styles } from './FastingModesCard.styles';

const S = INDIA_FIRST_STRINGS.fasting;

function modeLine(mode: FastingMode): string {
  const name = modeName(mode.mode);
  return mode.status === 'active'
    ? S.active(name, formatDateLabel(mode.end_date))
    : S.upcoming(name, formatDateLabel(mode.start_date), formatDateLabel(mode.end_date));
}

/**
 * Navratri, Ekadashi, Jain Paryushan and Ramadan as modes the user turns on
 * for their own dates. Plans made while one is on follow its food rules.
 */
export function FastingModesCard() {
  const modes = useFastingModes();
  const remove = useRemoveFastingMode();
  const [open, setOpen] = useState(false);
  const data = modes.data;
  const error = queryErrorMessage(modes.error, S.loadError);
  const current = (data?.modes ?? []).filter((m) => m.status !== 'past');

  async function handleRemove(mode: FastingMode) {
    try {
      await remove.mutateAsync(mode.id);
      toast.success(S.removed);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <SectionCard
      title={S.title}
      subtitle={S.subtitle}
      action={
        <Button size="small" startIcon={<AddRounded />} onClick={() => setOpen(true)} disabled={!data}>
          {S.add}
        </Button>
      }
    >
      {modes.isPending && <Skeleton variant="rounded" height={48} />}
      {error && !data && <ErrorState message={error} onRetry={() => modes.refetch()} />}
      {data && current.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {S.none}
        </Typography>
      )}
      {current.length > 0 && (
        <Stack sx={styles.list}>
          {current.map((mode) => (
            <Box key={mode.id} sx={styles.row(mode.status === 'active')}>
              <IconBadge icon={DarkModeRounded} tone={mode.status === 'active' ? 'primary' : 'info'} />
              <Box sx={styles.text}>
                <Typography variant="body2">{modeLine(mode)}</Typography>
              </Box>
              {mode.status === 'active' && <Chip size="small" color="primary" label={modeName(mode.mode)} />}
              <Tooltip title={S.removeAria(modeName(mode.mode))}>
                <span>
                  <IconButton
                    size="small"
                    aria-label={S.removeAria(modeName(mode.mode))}
                    onClick={() => handleRemove(mode)}
                    disabled={remove.isPending}
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
        </Stack>
      )}
      {open && data && <FastingModeDialog catalogue={data.catalogue} onClose={() => setOpen(false)} />}
    </SectionCard>
  );
}
