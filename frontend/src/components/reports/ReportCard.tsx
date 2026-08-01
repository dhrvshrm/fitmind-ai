import { useState } from "react";
import { Box, Chip, Collapse, IconButton, Paper, Stack, Typography } from "@mui/material";
import { ExpandMoreRounded } from "@mui/icons-material";
import { ReportDetail } from "./ReportDetail";
import { STRINGS } from "../../constants/strings";
import { formatTimestamp } from "../../utils/date";
import { formatWeekRange } from "../../utils/report";
import type { WeeklyReport } from "../../types/report";
import { reportCardStyles as styles } from "./ReportCard.styles";

const S = STRINGS.reports.card;

type ReportCardProps = {
  report: WeeklyReport;
};

/** Compact report preview; click the header to expand into the full detail view. */
export function ReportCard({ report }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Stack sx={styles.headerRow} onClick={() => setExpanded((v) => !v)}>
        <Box sx={styles.headerBody}>
          <Typography variant="h6" sx={styles.weekRange}>
            {formatWeekRange(report)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={styles.created}>
            {S.created(formatTimestamp(report.created_at))}
          </Typography>

          <Stack sx={styles.chipRow}>
            <Chip
              size="small"
              variant="outlined"
              label={S.workouts(report.workouts_completed, report.workouts_planned)}
            />
            <Chip size="small" color="primary" variant="outlined" label={S.xp(report.xp_earned)} />
          </Stack>

          {!expanded && (
            <Typography variant="body2" color="text.secondary" sx={styles.highlightTeaser}>
              {report.highlight}
            </Typography>
          )}
        </Box>

        <IconButton
          size="small"
          aria-label={expanded ? S.collapseAria : S.expandAria}
          sx={styles.expandIcon(expanded)}
        >
          <ExpandMoreRounded />
        </IconButton>
      </Stack>

      <Collapse in={expanded} unmountOnExit>
        <ReportDetail report={report} />
      </Collapse>
    </Paper>
  );
}
