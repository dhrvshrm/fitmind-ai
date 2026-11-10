import type { CSSProperties } from 'react';

/** motion.div takes a plain style object. */
export const revealStyles = {
  block: { minWidth: 0 } satisfies CSSProperties,
  fill: { minWidth: 0, height: '100%', display: 'grid' } satisfies CSSProperties,
};
