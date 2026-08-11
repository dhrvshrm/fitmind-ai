import type { SxProps, Theme } from "@mui/material";

export const changePasswordFormStyles = {
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    maxWidth: 420,
  },
  actions: {
    mt: 1,
    display: "flex",
  },
} satisfies Record<string, SxProps<Theme>>;
