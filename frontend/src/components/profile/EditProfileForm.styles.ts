import type { SxProps, Theme } from "@mui/material";

export const editProfileFormStyles = {
  grid: {
    display: "grid",
    gap: 2,
    gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
  },
  fullWidth: {
    gridColumn: { xs: "auto", sm: "1 / -1" },
  },
  goalIcon: {
    mr: 1,
    verticalAlign: "middle",
  },
  actions: {
    mt: 3,
    display: "flex",
    justifyContent: "flex-end",
  },
} satisfies Record<string, SxProps<Theme>>;
