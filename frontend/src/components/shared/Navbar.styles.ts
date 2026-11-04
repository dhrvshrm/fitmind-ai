import type { SxProps, Theme } from "@mui/material";

export const navbarStyles = {
  appBar: {
    zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
    bgcolor: "background.paper",
    color: "text.primary",
    borderBottom: "1px solid",
    borderColor: "divider",
  },
  menuButton: {
    mr: 1,
    display: { xs: "inline-flex", md: "none" },
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  brandIcon: {
    color: "primary.main",
  },
  brandName: {
    fontWeight: 700,
  },
  spacer: {
    flexGrow: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0.5,
  },
  avatar: {
    width: 32,
    height: 32,
    bgcolor: "primary.main",
    color: "primary.contrastText",
    fontSize: 14,
    fontWeight: 600,
  },
  menuHeader: {
    px: 2,
    py: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
