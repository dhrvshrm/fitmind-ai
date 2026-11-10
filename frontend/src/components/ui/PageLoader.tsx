import { Box, Skeleton } from '@mui/material';
import { pageLoaderStyles as styles } from './PageLoader.styles';

const CARD_COUNT = 4;

/**
 * Shown while a page's code loads: the shape of a page (title, subtitle,
 * cards), so the wait feels shorter and nothing jumps when content arrives.
 */
export function PageLoader() {
  return (
    <Box sx={styles.root} aria-busy="true">
      <Skeleton variant="text" sx={styles.title} />
      <Skeleton variant="text" sx={styles.subtitle} />
      <Box sx={styles.grid}>
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <Skeleton key={index} variant="rounded" sx={styles.card} />
        ))}
      </Box>
    </Box>
  );
}
