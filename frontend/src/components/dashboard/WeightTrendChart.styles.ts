import type { SxProps, Theme } from "@mui/material";

export const weightTrendChartStyles = {
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
  currentValue: {
    fontWeight: 700,
    color: "primary.main",
  },
  changeText: {
    display: "block",
    textAlign: "right",
  },
  chartWrap: {
    width: "100%",
    height: 240,
    mt: 1,
  },
  legendRow: {
    flexDirection: "row",
    gap: 2,
    mt: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0.75,
  },
  legendLineSolid: {
    width: 16,
    height: 2,
    bgcolor: "primary.main",
  },
  legendLineDashed: {
    width: 16,
    height: 0,
    borderTop: "2px dashed",
    borderColor: "rgba(170, 59, 255, 0.35)",
  },
  empty: {
    py: 5,
    textAlign: "center",
  },
} satisfies Record<string, SxProps<Theme>>;
