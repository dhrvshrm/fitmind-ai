import { Box, Button, Card, CircularProgress, Skeleton } from "@mui/material";
import { AutoAwesomeRounded, SummarizeRounded } from "@mui/icons-material";
import toast from "react-hot-toast";
import { ReportArchive } from "./ReportArchive";
import { useGenerateReport, useReportHistory } from "../../hooks/queries/useReportQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import { PageHeader } from "../ui/PageHeader";
import { ErrorState } from "../ui/ErrorState";
import { EmptyState } from "../ui/EmptyState";
import { reportsPageStyles as styles } from "./ReportsPage.styles";

const S = STRINGS.reports;

export function ReportsPage() {
  const history = useReportHistory();
  const generate = useGenerateReport();
  const reports = history.data ?? [];
  const error = queryErrorMessage(history.error, S.loadError);
  const isGenerating = generate.isPending;

  function handleGenerate() {
    generate.mutate(undefined, {
      onSuccess: () => toast.success(S.generated),
      onError: (err) => toast.error(resolveApiError(err, S.generateError)),
    });
  }

  const generateButton = (
    <Button
      variant="contained"
      onClick={handleGenerate}
      disabled={isGenerating}
      startIcon={isGenerating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRounded />}
    >
      {isGenerating ? S.generating : S.generate}
    </Button>
  );

  return (
    <Box>
      <PageHeader title={S.title} subtitle={S.subtitle} actions={generateButton} />

      {history.isPending && (
        <Box sx={styles.skeletonList}>
          <Skeleton variant="rounded" sx={styles.skeleton} />
          <Skeleton variant="rounded" sx={styles.skeleton} />
        </Box>
      )}
      {error && <ErrorState message={error} onRetry={() => history.refetch()} />}

      {history.isSuccess && reports.length === 0 && (
        <Card>
          <EmptyState icon={SummarizeRounded} title={S.noReportsTitle} description={S.noReportsBody} />
        </Card>
      )}

      {history.isSuccess && reports.length > 0 && <ReportArchive reports={reports} />}
    </Box>
  );
}
