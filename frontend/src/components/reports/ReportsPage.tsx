import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { AutoAwesomeRounded, SummarizeRounded } from "@mui/icons-material";
import toast from "react-hot-toast";
import { ReportArchive } from "./ReportArchive";
import { reportService } from "../../services/reportService";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import type { WeeklyReport } from "../../types/report";
import { reportsPageStyles as styles } from "./ReportsPage.styles";

const S = STRINGS.reports;

export function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await reportService.getHistory());
    } catch (err) {
      setError(resolveApiError(err, S.loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so the effect body itself schedules no state updates synchronously.
    queueMicrotask(() => {
      loadReports();
    });
  }, [loadReports]);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const fresh = await reportService.generate();
      setReports((prev) => [fresh, ...prev]);
      toast.success(S.generated);
    } catch (err) {
      toast.error(resolveApiError(err, S.generateError));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Box>
      <Stack sx={styles.headerRow}>
        <Box>
          <Typography variant="h5" sx={styles.title}>
            {S.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.subtitle}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={isGenerating}
          startIcon={
            isGenerating ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <AutoAwesomeRounded />
            )
          }
        >
          {isGenerating ? S.generating : S.generate}
        </Button>
      </Stack>

      {loading && <Skeleton variant="rounded" sx={styles.skeleton} />}
      {!loading && error && (
        <Alert severity="error" sx={styles.errorAlert}>
          {error}
        </Alert>
      )}

      {!loading && !error && reports.length === 0 && (
        <Paper variant="outlined" sx={styles.emptyCard}>
          <SummarizeRounded sx={styles.emptyIcon} />
          <Typography variant="h6" sx={styles.emptyTitle}>
            {S.noReportsTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.noReportsBody}
          </Typography>
        </Paper>
      )}

      {!loading && !error && reports.length > 0 && <ReportArchive reports={reports} />}
    </Box>
  );
}
