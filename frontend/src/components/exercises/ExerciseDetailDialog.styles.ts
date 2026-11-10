import { alpha, type SxProps, type Theme } from '@mui/material';

export const exerciseDetailDialogStyles = {
  paper: {
    // Tall on large screens so the demo, muscles and steps fit without much scrolling.
    height: { md: 'min(92vh, 1000px)' },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
    px: { xs: 2, sm: 3 },
    pt: { xs: 2, sm: 2.5 },
    pb: 2,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: 700,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1.5,
    mt: 0.75,
  },
  targets: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.75,
  },
  close: {
    mt: -0.5,
    mr: -1,
  },
  content: {
    px: { xs: 2, sm: 3 },
    py: 3,
  },
  skeleton: {
    height: 360,
  },
  body: {
    gap: 3.5,
  },
  facts: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
  },
  fact: {
    p: 1.75,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.5,
    borderRadius: 1.5,
  },
  factText: {
    minWidth: 0,
    display: 'grid',
  },
  factLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 600,
  },
  factValue: {
    fontWeight: 700,
    lineHeight: 1.3,
  },
  topGrid: {
    display: 'grid',
    gap: 3,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
    alignItems: 'start',
  },
  panel: {
    p: { xs: 2, sm: 2.5 },
    borderRadius: 2,
  },
  sectionTitle: {
    fontWeight: 700,
    mb: 1.5,
  },
  howGrid: {
    display: 'grid',
    gap: 3,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 7fr) minmax(0, 5fr)' },
    alignItems: 'start',
  },
  steps: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1.75,
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.5,
  },
  stepNumber: (theme: Theme) => ({
    width: 28,
    height: 28,
    flexShrink: 0,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    fontSize: 14,
    fontWeight: 700,
    color: theme.palette.primary.main,
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
  }),
  setupList: {
    gap: 2,
  },
  setupItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 1.5,
  },
  setupIcon: {
    mt: 0.25,
  },
  twoColumns: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
  },
  checkPanel:
    (good: boolean): SxProps<Theme> =>
    (theme) => {
      const color = good ? theme.palette.success.main : theme.palette.error.main;
      return {
        p: 2,
        borderRadius: 2,
        borderColor: alpha(color, 0.35),
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.08 : 0.04),
      };
    },
  checkList: {
    listStyle: 'none',
    m: 0,
    p: 0,
    gap: 1.25,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 1,
  },
  checkIcon: {
    mt: 0.15,
  },
  variation: {
    justifyContent: 'flex-start',
    gap: 1.5,
    p: 1,
    pr: 2,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    textAlign: 'left',
    transition: 'border-color 150ms ease',
    '&:hover, &:focus-visible': { borderColor: 'primary.main' },
  },
  variationImage: {
    width: 96,
    aspectRatio: '3 / 2',
    objectFit: 'cover',
    borderRadius: 2,
    flexShrink: 0,
  },
  variationText: {
    display: 'grid',
    minWidth: 0,
  },
  actions: {
    px: { xs: 2, sm: 3 },
    py: 1.5,
    gap: 2,
  },
  sourceNote: {
    flex: 1,
    minWidth: 0,
    display: { xs: 'none', sm: 'block' },
  },
  sourceInline: {
    display: { xs: 'block', sm: 'none' },
  },
};
