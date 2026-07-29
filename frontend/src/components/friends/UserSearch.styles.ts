import type { SxProps, Theme } from "@mui/material";

export const userSearchStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  title: {
    fontWeight: 700,
    mb: 1.5,
  },
  form: {
    flexDirection: "row",
    gap: 1,
  },
  field: {
    flex: 1,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
    mt: 2,
    p: 1.5,
    borderRadius: 2.5,
    bgcolor: "action.hover",
  },
  avatar: {
    bgcolor: "primary.main",
    fontWeight: 700,
  },
  resultBody: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontWeight: 700,
  },
  hint: {
    mt: 1.5,
    display: "block",
  },
} satisfies Record<string, SxProps<Theme>>;
