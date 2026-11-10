import type { SxProps, Theme } from "@mui/material";

export const profilePageStyles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    maxWidth: 900,
  },
  heroRow: {
    flexDirection: { xs: "column", sm: "row" },
    alignItems: { xs: "flex-start", sm: "center" },
    gap: 2,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 72,
    height: 72,
    fontSize: 30,
    fontWeight: 700,
    bgcolor: "primary.main",
    color: "primary.contrastText",
  },
  name: {
    fontWeight: 700,
    overflowWrap: "anywhere",
  },
  handle: {
    overflowWrap: "anywhere",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1,
    mt: 1,
  },
  achievements: {
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  heroSkeleton: {
    height: 120,
  },
  skeleton: {
    height: 240,
  },
} satisfies Record<string, SxProps<Theme>>;
