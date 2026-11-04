import { Box, CircularProgress } from '@mui/material';
import { pageLoaderStyles as styles } from './PageLoader.styles';

/** Centered spinner shown while a page's code chunk loads. */
export function PageLoader() {
  return (
    <Box sx={styles.root}>
      <CircularProgress size={28} />
    </Box>
  );
}
