import type { SxProps, Theme } from "@mui/material";

export const userSearchStyles = {
  form: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  field: {
    flex: 1,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 1.5,
    mt: 2,
    p: 1.5,
    borderRadius: 1,
    bgcolor: "action.hover",
  },
  avatar: {
    bgcolor: "primary.main",
    color: "primary.contrastText",
    fontWeight: 700,
  },
  resultBody: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  hint: {
    mt: 1.5,
    display: "block",
  },
} satisfies Record<string, SxProps<Theme>>;
