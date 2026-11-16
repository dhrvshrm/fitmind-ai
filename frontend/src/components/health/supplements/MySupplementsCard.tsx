import { useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { AddRounded, MedicationRounded, MoreVertRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { SUPPLEMENT_STRINGS } from '../../../constants/supplementStrings';
import { queryErrorMessage } from '../../../hooks/queries/queryHelpers';
import {
  useMySupplements,
  useRemoveSupplement,
  useSetSupplementTaken,
  useSupplementHistory,
} from '../../../hooks/queries/useSupplementQueries';
import { resolveApiError } from '../../../lib/apiClient';
import type { UserSupplement } from '../../../types/supplements';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SectionCard } from '../../ui/SectionCard';
import { SupplementDialog } from './SupplementDialog';
import { SupplementRoutine } from './SupplementRoutine';
import { mySupplementsCardStyles as styles } from './MySupplementsCard.styles';

const S = SUPPLEMENT_STRINGS.mine;
const H = SUPPLEMENT_STRINGS.history;

/** The supplements the user takes: tick today off, edit or stop, and the last two weeks. */
export function MySupplementsCard() {
  const mine = useMySupplements();
  const history = useSupplementHistory();
  const setTaken = useSetSupplementTaken();
  const remove = useRemoveSupplement();
  const [menu, setMenu] = useState<{ anchor: HTMLElement; item: UserSupplement } | null>(null);
  const [editing, setEditing] = useState<UserSupplement | null>(null);
  const [removing, setRemoving] = useState<UserSupplement | null>(null);
  const [adding, setAdding] = useState(false);
  const error = queryErrorMessage(mine.error, S.loadError);

  async function toggle(item: UserSupplement) {
    try {
      await setTaken.mutateAsync({ id: item.id, taken: !item.taken_today });
    } catch (err) {
      toast.error(resolveApiError(err, S.tickError));
    }
  }

  async function handleRemove() {
    if (!removing) return;
    try {
      await remove.mutateAsync(removing.id);
      toast.success(S.removed);
      setRemoving(null);
    } catch (err) {
      toast.error(resolveApiError(err, S.tickError));
    }
  }

  const days = history.data ?? [];
  const anyHistory = days.some((d) => d.taken > 0);

  return (
    <SectionCard
      title={S.title}
      subtitle={S.subtitle}
      action={
        <Button size="small" startIcon={<AddRounded />} onClick={() => setAdding(true)}>
          {S.addCustom}
        </Button>
      }
    >
      {mine.isPending && <Skeleton variant="rounded" height={120} />}
      {error && !mine.data && <ErrorState message={error} onRetry={() => mine.refetch()} />}
      {mine.data && mine.data.length === 0 && (
        <EmptyState icon={MedicationRounded} title={S.empty} description={S.emptyBody} />
      )}
      {mine.data && mine.data.length > 0 && (
        <Stack component="ul" sx={styles.list}>
          {mine.data.map((item) => (
            <Box component="li" key={item.id} sx={styles.row(item.taken_today)}>
              <Checkbox
                checked={item.taken_today}
                onChange={() => toggle(item)}
                disabled={setTaken.isPending}
                slotProps={{ input: { 'aria-label': S.takenAria(item.name) } }}
              />
              <Box sx={styles.text}>
                <Typography variant="body2" sx={styles.name(item.taken_today)}>
                  {item.name}
                  {item.dose && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      {' · '}
                      {item.dose}
                    </Typography>
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {SUPPLEMENT_STRINGS.timings[item.timing]}
                  {item.reminder_time ? ` · ${S.remindAt(item.reminder_time)}` : ''}
                  {item.macros_per_serving
                    ? ` · ${S.addsNutrition(item.macros_per_serving.protein, item.macros_per_serving.calories)}`
                    : ''}
                </Typography>
              </Box>
              <IconButton
                size="small"
                aria-label={S.menuAria(item.name)}
                onClick={(e: MouseEvent<HTMLElement>) => setMenu({ anchor: e.currentTarget, item })}
              >
                <MoreVertRounded fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}

      {mine.data && mine.data.length > 0 && <SupplementRoutine />}

      {mine.data && mine.data.length > 0 && (
        <Box sx={styles.history}>
          <Typography variant="caption" sx={styles.historyTitle}>
            {H.title}
          </Typography>
          {anyHistory ? (
            <Box sx={styles.strip}>
              {days.map((day) => (
                <Tooltip key={day.date} title={H.day(day.date, day.taken, day.total)}>
                  <Box sx={styles.dot(day.total ? day.taken / day.total : 0)} />
                </Tooltip>
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" component="p">
              {H.none}
            </Typography>
          )}
        </Box>
      )}

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            setEditing(menu?.item ?? null);
            setMenu(null);
          }}
        >
          {S.edit}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setRemoving(menu?.item ?? null);
            setMenu(null);
          }}
        >
          {S.remove}
        </MenuItem>
      </Menu>
      {adding && <SupplementDialog onClose={() => setAdding(false)} />}
      {editing && <SupplementDialog editing={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(removing)}
        title={S.removeTitle}
        description={S.removeBody}
        confirmLabel={S.remove}
        destructive
        loading={remove.isPending}
        onConfirm={handleRemove}
        onClose={() => setRemoving(null)}
      />
    </SectionCard>
  );
}
