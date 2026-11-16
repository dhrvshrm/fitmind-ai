import { useState } from 'react';
import { Box, Skeleton } from '@mui/material';
import { HEALTH_STRINGS } from '../../../constants/healthStrings';
import { LAB_REPORT_STRINGS } from '../../../constants/labReportStrings';
import { useConsents } from '../../../hooks/queries/useHealthQueries';
import { queryErrorMessage } from '../../../hooks/queries/queryHelpers';
import { ErrorState } from '../../ui/ErrorState';
import { ConsentCard } from '../ConsentCard';
import { PrivacyCard } from '../PrivacyCard';
import { BiomarkersCard } from './BiomarkersCard';
import { ReportReviewDialog } from './ReportReviewDialog';
import { ReportsListCard } from './ReportsListCard';
import { ReportUploadCard } from './ReportUploadCard';
import { reportsTabStyles as styles } from './ReportsTab.styles';

/**
 * Lab reports: consent first, then upload, check the values read from the
 * report, and the saved results over time.
 */
export function ReportsTab() {
  const consents = useConsents();
  const [reviewing, setReviewing] = useState<string | null>(null);
  const error = queryErrorMessage(consents.error, HEALTH_STRINGS.page.loadError);
  const consent = consents.data?.find((c) => c.scope === 'health_reports');

  if (error && !consents.data) return <ErrorState message={error} onRetry={() => consents.refetch()} />;
  if (!consents.data) return <Skeleton variant="rounded" height={420} />;
  if (!consent?.granted) return <ConsentCard scope="health_reports" strings={LAB_REPORT_STRINGS.consent} />;

  return (
    <Box sx={styles.grid}>
      <Box sx={styles.main}>
        <ReportUploadCard onUploaded={(report) => setReviewing(report.id)} />
        <BiomarkersCard />
      </Box>
      <Box sx={styles.side}>
        <ReportsListCard onReview={setReviewing} />
        <PrivacyCard grantedAt={consent.granted_at} scope="health_reports" strings={LAB_REPORT_STRINGS.privacy} />
      </Box>
      {reviewing && <ReportReviewDialog reportId={reviewing} onClose={() => setReviewing(null)} />}
    </Box>
  );
}
