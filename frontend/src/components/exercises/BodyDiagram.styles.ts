import type { CSSProperties } from 'react';

export const bodyDiagramStyles = {
  root: {
    flex: '0 1 150px',
    minWidth: 0,
    textAlign: 'center',
  },
  svg: {
    display: 'block',
    width: '100%',
    height: 'auto',
    overflow: 'visible',
  },
  label: {
    display: 'block',
    mt: 0.5,
    fontWeight: 600,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  /** Plain SVG elements take a style object, not sx. */
  polygon: (isMuscle: boolean): CSSProperties => ({
    cursor: isMuscle ? 'pointer' : 'default',
    transition: 'opacity 120ms ease',
  }),
};
