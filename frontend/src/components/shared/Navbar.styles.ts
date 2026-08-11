import type { SxProps, Theme } from "@mui/material";

export const navbarStyles = {
  appBar: {
    zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
    bgcolor: "background.paper",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    color: "text.primary",
    borderBottom: "1px solid",
    borderColor: "divider",
    boxShadow: "0 1px 14px rgba(76, 29, 149, 0.05)",
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
    filter: "drop-shadow(0 2px 6px rgba(170, 59, 255, 0.4))",
  },
  brandName: {
    fontWeight: 800,
    letterSpacing: 0.2,
    background: "linear-gradient(120deg, #aa3bff 0%, #12b8a6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  spacer: {
    flexGrow: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    background: "linear-gradient(135deg, #aa3bff 0%, #7a1fd0 100%)",
    fontSize: 14,
    fontWeight: 700,
    boxShadow: "0 4px 12px rgba(170, 59, 255, 0.35)",
  },
  menuHeader: {
    px: 2,
    py: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
