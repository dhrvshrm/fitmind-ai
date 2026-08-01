import type { SxProps, Theme } from "@mui/material";

export const reportCardStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 1.5,
    cursor: "pointer",
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
  },
  weekRange: {
    fontWeight: 700,
  },
  created: {
    display: "block",
    mt: 0.25,
  },
  chipRow: {
    flexDirection: "row",
    gap: 1,
    mt: 1,
    flexWrap: "wrap",
  },
  expandIcon: (expanded: boolean): SxProps<Theme> => ({
    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.2s ease",
  }),
  highlightTeaser: {
    mt: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
};
