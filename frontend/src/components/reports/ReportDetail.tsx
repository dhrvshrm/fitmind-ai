import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { AutoAwesomeRounded, DownloadRounded, ShareRounded } from "@mui/icons-material";
import toast from "react-hot-toast";
import { MoodTrendChip } from "./MoodTrendChip";
import { RecoveryTrendChip } from "./RecoveryTrendChip";
import { STRINGS } from "../../constants/strings";
import { MACRO_COLORS } from "../../constants/nutrition";
import { buildReportShareText } from "../../utils/report";
import type { WeeklyReport } from "../../types/report";
import { reportDetailStyles as styles } from "./ReportDetail.styles";

const S = STRINGS.reports.detail;

type ReportDetailProps = {
  report: WeeklyReport;
};

/** Full report body: highlight callout, stat cards, trend chips, AI recap, and share/download actions. */
export function ReportDetail({ report }: ReportDetailProps) {
  const workoutPercent =
    report.workouts_planned > 0
      ? Math.min(100, (report.workouts_completed / report.workouts_planned) * 100)
      : 0;

  async function handleShare() {
    const text = buildReportShareText(report);
    if (navigator.share) {
      try {
        await navigator.share({ title: STRINGS.reports.title, text });
      } catch {
        // User cancelled the native share sheet — not an error worth surfacing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(S.shareCopied);
    } catch {
      toast.error(S.shareError);
    }
  }

  function handleDownload() {
    const text = buildReportShareText(report);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fitmind-report-${report.week_start}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(S.downloaded);
  }

  return (
    <Box sx={styles.root}>
      <Box sx={styles.highlightBox}>
        <AutoAwesomeRounded sx={styles.highlightIcon} />
        <Box>
          <Typography variant="caption" color="text.secondary">
            {S.highlightTitle}
          </Typography>
          <Typography variant="body1" sx={styles.highlightText}>
            {report.highlight}
          </Typography>
        </Box>
      </Box>

      <Typography variant="subtitle1" sx={styles.sectionTitle}>
        {S.statsTitle}
      </Typography>
      <Box sx={styles.statsGrid}>
        <Box sx={styles.statCard}>
          <Typography variant="caption" color="text.secondary" sx={styles.statLabel}>
            {S.workoutsLabel}
          </Typography>
          <Typography sx={styles.statValue}>
            {report.workouts_completed}/{report.workouts_planned}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={workoutPercent}
            sx={styles.workoutsProgress}
          />
        </Box>

        <Box sx={styles.statCard}>
          <Typography variant="caption" color="text.secondary" sx={styles.statLabel}>
            {S.xpLabel}
          </Typography>
          <Typography sx={styles.statValue}>{report.xp_earned}</Typography>
        </Box>

        <Box sx={styles.statCard}>
          <Typography variant="caption" color="text.secondary" sx={styles.statLabel}>
            {S.caloriesLabel}
          </Typography>
          <Typography sx={styles.statValue}>{report.avg_calories} kcal</Typography>
        </Box>

        <Box sx={styles.statCard}>
          <Typography variant="caption" color="text.secondary" sx={styles.statLabel}>
            {S.macrosLabel}
          </Typography>
          <Stack sx={styles.macroRow}>
            <Box component="span" sx={styles.macroChip(MACRO_COLORS.protein)}>
              P{report.avg_protein}
            </Box>
            <Box component="span" sx={styles.macroChip(MACRO_COLORS.carbs)}>
              C{report.avg_carbs}
            </Box>
            <Box component="span" sx={styles.macroChip(MACRO_COLORS.fats)}>
              F{report.avg_fats}
            </Box>
          </Stack>
        </Box>
      </Box>

      <Stack sx={styles.trendRow}>
        <MoodTrendChip trend={report.mood_trend} />
        <RecoveryTrendChip trend={report.recovery_trend} />
      </Stack>

      <Typography variant="subtitle1" sx={styles.sectionTitle}>
        {S.recapTitle}
      </Typography>
      <Box sx={styles.recapBox}>
        <Typography variant="body2" sx={styles.recapText}>
          {report.content}
        </Typography>
      </Box>

      <Stack sx={styles.actionsRow}>
        <Button variant="outlined" startIcon={<ShareRounded />} onClick={handleShare}>
          {S.share}
        </Button>
        <Button variant="outlined" startIcon={<DownloadRounded />} onClick={handleDownload}>
          {S.download}
        </Button>
      </Stack>
    </Box>
  );
}
