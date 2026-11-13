import { alpha, type SxProps, type Theme } from "@mui/material";
import { FONTS } from "../../theme";

export const navbarStyles = {
  // Frosted paper over the page's doodles, with a dashed rule like a diary header.
  appBar: ((theme) => ({
    zIndex: theme.zIndex.drawer + 1,
    bgcolor: alpha(theme.palette.background.paper, 0.86),
    backdropFilter: "saturate(150%) blur(12px)",
    color: theme.palette.text.primary,
    borderBottom: `1px dashed ${theme.palette.divider}`,
  })) satisfies SxProps<Theme>,
  // Default toolbar height, so the page and sidebar spacers line up.
  toolbar: {
    gap: 1,
  },
  menuButton: {
    display: { xs: "inline-flex", md: "none" },
  },
  brandLink: {
    display: "inline-flex",
    borderRadius: 2,
  },
  // Today's date in the middle, set in the display serif.
  date: {
    display: { xs: "none", md: "block" },
    flexGrow: 1,
    textAlign: "center",
    fontFamily: FONTS.display,
    fontStyle: "italic",
    fontWeight: 500,
    fontSize: "1.05rem",
    color: "text.secondary",
  },
  // Theme, notifications and account gathered in one pill.
  actions: ((theme) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 0.25,
    ml: { xs: "auto", md: 0 },
    p: 0.5,
    borderRadius: "999px",
    bgcolor: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    "& .MuiIconButton-root": { borderRadius: "999px" },
  })) satisfies SxProps<Theme>,
  actionButton: {
    width: 38,
    height: 38,
  },
  badge: {
    "& .MuiBadge-badge": { fontWeight: 700, fontSize: "0.68rem", minWidth: 18, height: 18 },
  },
  avatarButton: {
    p: 0.25,
  },
  // A paper ring and a clay ring around the initial, like an ink stamp.
  avatar: ((theme) => ({
    width: 34,
    height: 34,
    bgcolor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: 700,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 3.5px ${theme.palette.secondary.main}`,
  })) satisfies SxProps<Theme>,
  menuHeader: {
    px: 2,
    py: 1,
  },
  inkTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 3,
    cursor: "default",
  },
  inkFill:
    (percent: number): SxProps<Theme> =>
    (theme) => ({
      height: "100%",
      width: `${percent}%`,
      borderRadius: "0 3px 3px 0",
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      transition: "width 600ms cubic-bezier(0.22, 1, 0.36, 1)",
    }),
};
