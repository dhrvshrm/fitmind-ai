import type { SxProps, Theme } from "@mui/material";

export const reportsPageStyles = {
  skeletonList: {
    display: "grid",
    gap: 2,
  },
  skeleton: {
    height: 140,
  },
} satisfies Record<string, SxProps<Theme>>;
