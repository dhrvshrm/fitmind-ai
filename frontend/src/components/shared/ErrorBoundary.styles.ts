import type { SxProps, Theme } from "@mui/material";

export const errorBoundaryStyles = {
  root: {
    minHeight: "100svh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    p: 2,
    bgcolor: "background.default",
  },
  card: {
    p: { xs: 3, sm: 5 },
    width: "100%",
    maxWidth: 460,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  title: {
    mt: 2,
    mb: 1,
  },
  body: {
    mb: 3,
  },
} satisfies Record<string, SxProps<Theme>>;
