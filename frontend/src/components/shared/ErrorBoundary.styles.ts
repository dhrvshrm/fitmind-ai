import type { SxProps, Theme } from "@mui/material";

export const errorBoundaryStyles = {
  root: {
    minHeight: "100svh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    p: 3,
    background: "linear-gradient(160deg, #f7f6fb 0%, #efe6fb 100%)",
  },
  card: {
    p: { xs: 3, sm: 5 },
    maxWidth: 460,
    textAlign: "center",
    borderRadius: 3,
  },
  icon: {
    fontSize: 52,
    color: "error.main",
    mb: 1,
  },
  title: {
    fontWeight: 700,
    mb: 1,
  },
  body: {
    mb: 3,
  },
} satisfies Record<string, SxProps<Theme>>;
