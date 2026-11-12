import type { SxProps, Theme } from '@mui/material';

export const barcodeScanDialogStyles = {
  camera: {
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden',
    bgcolor: 'action.hover',
    mb: 2,
  },
  video: {
    display: 'block',
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    bgcolor: 'common.black',
  },
  cameraIdle: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 1,
    px: 2,
    aspectRatio: '4 / 3',
  },
  cameraIcon: {
    fontSize: 48,
    color: 'text.secondary',
  },
  cameraButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    bgcolor: 'background.paper',
    '&:hover': { bgcolor: 'background.paper' },
  },
  notice: {
    mb: 2,
  },
  manual: {
    display: 'flex',
    gap: 1,
    alignItems: 'center',
    mb: 2,
  },
  product: {
    flexDirection: 'row',
    gap: 1.5,
    alignItems: 'center',
    mb: 2,
  },
  productImage: {
    width: 64,
    height: 64,
    bgcolor: 'action.hover',
    color: 'text.secondary',
  },
  productText: {
    minWidth: 0,
  },
  productName: {
    fontWeight: 600,
    lineHeight: 1.3,
  },
  amountTitle: {
    mb: 1,
  },
  servings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0.75,
    mb: 1.5,
  },
  amountField: {
    width: 140,
  },
  total: {
    mt: 1.5,
    fontWeight: 600,
  },
  provenance: {
    mt: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
