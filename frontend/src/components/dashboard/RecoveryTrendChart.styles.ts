import type { SxProps, Theme } from "@mui/material";

export const recoveryTrendChartStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    height: "100%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    mb: 0.5,
  },
  title: {
    fontWeight: 700,
  },
  trendChip: {
    fontWeight: 700,
  },
  chartWrap: {
    width: "100%",
    height: 240,
    mt: 1,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1.5,
    mt: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0.75,
  },
  legendDot: (color: string): SxProps<Theme> => ({
    width: 10,
    height: 10,
    borderRadius: "50%",
    bgcolor: color,
  }),
  empty: {
    py: 5,
    textAlign: "center",
  },
};
