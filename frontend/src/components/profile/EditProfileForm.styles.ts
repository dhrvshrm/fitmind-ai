import type { SxProps, Theme } from "@mui/material";

export const editProfileFormStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  title: {
    fontWeight: 700,
    mb: 2,
  },
  grid: {
    display: "grid",
    gap: 2,
    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
  },
  fullWidth: {
    gridColumn: { xs: "auto", sm: "1 / -1" },
  },
  actions: {
    mt: 3,
    display: "flex",
    justifyContent: "flex-end",
  },
} satisfies Record<string, SxProps<Theme>>;
