export const weeklyVolumeStyles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    width: '100%',
  },
  title: {
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gap: 1,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
  rowHead: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 1,
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
};
