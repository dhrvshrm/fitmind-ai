import type { SxProps, Theme } from "@mui/material";

export const xpEarnedChartStyles = {
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
  totalChip: {
    fontWeight: 700,
  },
  chartWrap: {
    width: "100%",
    height: 240,
    mt: 1,
  },
  empty: {
    py: 5,
    textAlign: "center",
  },
} satisfies Record<string, SxProps<Theme>>;
