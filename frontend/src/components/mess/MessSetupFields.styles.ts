import type { SxProps, Theme } from '@mui/material';

export const messSetupFieldsStyles = {
  root: {
    display: 'grid',
    gap: 2.5,
  },
  label: {
    fontWeight: 700,
    mb: 1,
  },
  help: {
    mt: -0.5,
    mb: 1,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0.75,
  },
} satisfies Record<string, SxProps<Theme>>;
