import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { AddAPhotoRounded, QrCodeScannerRounded } from '@mui/icons-material';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import type { MealEstimate } from '../../types/nutrition';
import { BarcodeScanDialog } from './BarcodeScanDialog';
import { PhotoLogDialog } from './PhotoLogDialog';
import { scanPhotoActionsStyles as styles } from './ScanPhotoActions.styles';

const S = ACTIVITY_STRINGS.scan;

type ScanPhotoActionsProps = {
  /** Receives the estimate to show in the review step. */
  onEstimate: (estimate: MealEstimate) => void;
  disabled?: boolean;
};

/** "Scan barcode" and "Photo" entry points for the quick log, with their dialogs. */
export function ScanPhotoActions({ onEstimate, disabled = false }: ScanPhotoActionsProps) {
  const [dialog, setDialog] = useState<'barcode' | 'photo' | null>(null);

  return (
    <Box sx={styles.root}>
      <Button
        size="small"
        startIcon={<QrCodeScannerRounded />}
        onClick={() => setDialog('barcode')}
        disabled={disabled}
      >
        {S.barcodeButton}
      </Button>
      <Button size="small" startIcon={<AddAPhotoRounded />} onClick={() => setDialog('photo')} disabled={disabled}>
        {S.photoButton}
      </Button>
      <BarcodeScanDialog open={dialog === 'barcode'} onClose={() => setDialog(null)} onEstimate={onEstimate} />
      <PhotoLogDialog open={dialog === 'photo'} onClose={() => setDialog(null)} onEstimate={onEstimate} />
    </Box>
  );
}
