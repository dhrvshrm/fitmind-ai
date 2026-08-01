import type { SxProps, Theme } from "@mui/material";

export const reportsPageStyles = {
  headerRow: {
    flexDirection: { xs: "column", sm: "row" },
    justifyContent: "space-between",
    alignItems: { xs: "flex-start", sm: "center" },
    gap: 2,
    mb: 3,
  },
  title: {
    fontWeight: 700,
  },
  skeleton: {
    borderRadius: 3,
    height: 160,
  },
  errorAlert: {
    mb: 2,
  },
  emptyCard: {
    p: { xs: 3, sm: 5 },
    borderRadius: 3,
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: 44,
    color: "primary.main",
    mb: 1,
  },
  emptyTitle: {
    fontWeight: 700,
    mb: 0.5,
  },
} satisfies Record<string, SxProps<Theme>>;
