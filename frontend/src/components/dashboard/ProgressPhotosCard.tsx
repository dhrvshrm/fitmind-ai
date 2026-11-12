import { useRef, useState, type ChangeEvent } from 'react';
import { Box, Button, CircularProgress, IconButton, Skeleton, Tooltip, Typography } from '@mui/material';
import { AddAPhotoRounded, CloudOffRounded, DeleteOutlineRounded, PhotoLibraryRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { useDeletePhoto, useProgressPhotos, useUploadPhoto } from '../../hooks/queries/useProgressQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import { formatDateLabel } from '../../utils/date';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { SectionCard } from '../ui/SectionCard';
import { progressPhotosCardStyles as styles } from './ProgressPhotosCard.styles';

const S = PROGRESS_STRINGS.photos;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

/** Private progress photos by date. Shown as unavailable when the server has no private storage. */
export function ProgressPhotosCard() {
  const photos = useProgressPhotos();
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const input = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const data = photos.data;
  const error = queryErrorMessage(photos.error, PROGRESS_STRINGS.page.loadError);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(S.tooLarge);
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success(S.uploaded);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete);
      toast.success(S.deleted);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    } finally {
      setPendingDelete(null);
    }
  }

  const action = data?.available ? (
    <Button
      size="small"
      startIcon={upload.isPending ? <CircularProgress size={16} color="inherit" /> : <AddAPhotoRounded />}
      onClick={() => input.current?.click()}
      disabled={upload.isPending}
    >
      {upload.isPending ? S.uploading : S.add}
    </Button>
  ) : undefined;

  return (
    <SectionCard title={S.title} subtitle={S.subtitle} action={action}>
      <Box component="input" ref={input} type="file" accept={ACCEPT} hidden onChange={handleFile} />
      {photos.isPending && <Skeleton variant="rounded" height={120} />}
      {error && !data && <ErrorState message={error} onRetry={() => photos.refetch()} />}
      {data && !data.available && (
        <EmptyState compact icon={CloudOffRounded} title={S.unavailableTitle} description={S.unavailableBody} />
      )}
      {data?.available && data.photos.length === 0 && (
        <EmptyState compact icon={PhotoLibraryRounded} title={S.emptyTitle} description={S.emptyBody} />
      )}
      {data?.available && data.photos.length > 0 && (
        <Box sx={styles.grid}>
          {data.photos.map((photo) => (
            <Box key={photo.id} sx={styles.tile}>
              {photo.url && (
                <Box component="img" src={photo.url} alt={S.alt(formatDateLabel(photo.date))} loading="lazy" sx={styles.image} />
              )}
              <Box sx={styles.caption}>
                <Typography variant="caption" sx={styles.date}>
                  {formatDateLabel(photo.date)}
                </Typography>
                <Tooltip title={S.delete}>
                  <IconButton size="small" aria-label={S.delete} onClick={() => setPendingDelete(photo.id)} sx={styles.delete}>
                    <DeleteOutlineRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={S.deleteTitle}
        description={S.deleteBody}
        confirmLabel={S.delete}
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </SectionCard>
  );
}
