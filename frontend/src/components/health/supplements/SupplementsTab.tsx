import { Box } from '@mui/material';
import { EssentialsCard } from './EssentialsCard';
import { MySupplementsCard } from './MySupplementsCard';
import { SupplementCatalogCard } from './SupplementCatalogCard';
import { supplementsTabStyles as styles } from './SupplementsTab.styles';

/** What the person takes (tick off today) beside the catalogue, checked against their profile. */
export function SupplementsTab() {
  return (
    <Box sx={styles.grid}>
      <Box sx={styles.side}>
        <MySupplementsCard />
      </Box>
      <Box sx={styles.main}>
        <EssentialsCard />
        <SupplementCatalogCard />
      </Box>
    </Box>
  );
}
