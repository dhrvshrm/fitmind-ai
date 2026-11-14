import type { SxProps, Theme } from '@mui/material';

export const planMealCardStyles = {
  card: {
    height: '100%',
    px: { xs: 1.5, sm: 2 },
    pt: 1.5,
    pb: 1.25,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 1,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 1,
    rowGap: 0.5,
    minWidth: 0,
    '& h3': { whiteSpace: 'nowrap' },
  },
  number: {
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  items: {
    listStyle: 'none',
    m: 0,
    mt: 1,
    p: 0,
    flex: 1,
    // Wide screens: foods side by side, so a meal card stays short.
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
    columnGap: 4,
    alignContent: 'start',
  },
  // A meal eaten off-plan: the planned foods stay visible but step back.
  itemsMuted: {
    listStyle: 'none',
    m: 0,
    p: 0,
    flex: 1,
    opacity: 0.55,
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
    columnGap: 4,
    alignContent: 'start',
  },
  adjust: {
    alignSelf: 'flex-start',
    mt: 1,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  eaten: {
    mt: 1,
  },
  eatenTitle: {
    color: 'success.main',
    fontWeight: 700,
    lineHeight: 1.6,
  },
  eatenList: {
    listStyle: 'none',
    m: 0,
    p: 0,
  },
  eatenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    py: 0.5,
  },
  eatenIcon: {
    color: 'success.main',
  },
  plannedLabel: {
    display: 'block',
    mt: 1,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    py: 0.75,
    borderTop: '1px solid',
    borderColor: 'divider',
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontWeight: 500,
  },
  // The oil or ghee a dish assumes, in the clay accent so it is easy to spot.
  fat: {
    color: 'secondary.main',
    fontWeight: 600,
  },
  fatLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
    alignSelf: 'flex-start',
    color: 'secondary.main',
    cursor: 'help',
    '& .MuiSvgIcon-root': { fontSize: 16 },
  },
  footer: {
    gap: 1,
    pt: 1,
    borderTop: '1px solid',
    borderColor: 'divider',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    '& .MuiButton-root': {
      whiteSpace: 'nowrap',
    },
  },
  logged: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
    color: 'success.main',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, SxProps<Theme>>;
