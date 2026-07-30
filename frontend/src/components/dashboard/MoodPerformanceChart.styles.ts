import type { SxProps, Theme } from "@mui/material";

export const moodPerformanceChartStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    height: "100%",
  },
  title: {
    fontWeight: 700,
  },
  chartWrap: {
    width: "100%",
    height: 260,
    mt: 1,
  },
  empty: {
    py: 5,
    textAlign: "center",
  },
} satisfies Record<string, SxProps<Theme>>;
