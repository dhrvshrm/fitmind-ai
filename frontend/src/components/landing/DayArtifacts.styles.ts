import { alpha, type SxProps, type Theme } from '@mui/material';
import { FONTS } from '../../theme';

/** Numbers on the receipt and logbook, like a till roll. */
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

const paperShadow = (theme: Theme) =>
  `0 10px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.1)}`;

export const dayArtifactsStyles = {
  // 6:45 - a clay-peach sticky note with a strip of tape.
  sticky: ((theme) => ({
    position: 'relative',
    width: 240,
    p: 2.5,
    pt: 3,
    bgcolor: theme.palette.mode === 'light' ? alpha(theme.palette.secondary.light, 0.4) : alpha(theme.palette.secondary.main, 0.28),
    color: theme.palette.text.primary,
    transform: 'rotate(-2.5deg)',
    boxShadow: paperShadow(theme),
    borderRadius: '2px',
  })) satisfies SxProps<Theme>,
  tape: ((theme) => ({
    position: 'absolute',
    top: -10,
    left: '50%',
    width: 72,
    height: 22,
    transform: 'translateX(-50%) rotate(3deg)',
    bgcolor: alpha(theme.palette.background.paper, 0.6),
    border: `1px solid ${theme.palette.divider}`,
  })) satisfies SxProps<Theme>,
  stickyText: {
    fontFamily: FONTS.hand,
    fontSize: '1.7rem',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  stickySub: {
    fontFamily: FONTS.hand,
    fontSize: '1.3rem',
    mt: 1,
    opacity: 0.75,
  },

  // 7:30 - a page from a gym logbook on graph paper, with a rubber stamp.
  logbook: ((theme) => ({
    position: 'relative',
    width: '100%',
    maxWidth: 380,
    p: 2.5,
    bgcolor: theme.palette.background.paper,
    backgroundImage: `linear-gradient(${theme.palette.divider} 1px, transparent 1px), linear-gradient(90deg, ${theme.palette.divider} 1px, transparent 1px)`,
    backgroundSize: '18px 18px',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '6px',
    boxShadow: paperShadow(theme),
    transform: 'rotate(1deg)',
  })) satisfies SxProps<Theme>,
  logTitle: {
    fontFamily: FONTS.hand,
    fontSize: '1.6rem',
    fontWeight: 700,
    mb: 1,
  },
  logTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: MONO,
    fontSize: '0.85rem',
  },
  logHead: {
    textAlign: 'left',
    fontFamily: FONTS.body,
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'text.secondary',
    pb: 0.75,
  },
  logCell:
    (today: boolean): SxProps<Theme> => ({
      py: 0.6,
      fontWeight: today ? 700 : 400,
      color: today ? 'success.main' : 'text.primary',
      borderTop: 1,
      borderColor: 'divider',
    }),
  stamp: ((theme) => ({
    position: 'absolute',
    right: -14,
    top: -18,
    px: 1.5,
    py: 0.75,
    border: `2.5px solid ${theme.palette.success.main}`,
    borderRadius: '8px',
    color: theme.palette.success.main,
    bgcolor: alpha(theme.palette.background.paper, 0.85),
    fontWeight: 800,
    fontSize: '0.78rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    transform: 'rotate(8deg)',
  })) satisfies SxProps<Theme>,

  // 1:30 - a chat message and the till receipt it turns into.
  lunch: {
    gap: 1.5,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 360,
  },
  bubble: ((theme) => ({
    alignSelf: 'flex-end',
    px: 2,
    py: 1.25,
    borderRadius: '18px 18px 4px 18px',
    bgcolor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontWeight: 600,
  })) satisfies SxProps<Theme>,
  receipt: ((theme) => ({
    width: '100%',
    p: 2.25,
    pb: 3,
    bgcolor: theme.palette.background.paper,
    fontFamily: MONO,
    fontSize: '0.82rem',
    boxShadow: paperShadow(theme),
    // A torn, zigzag bottom edge.
    WebkitMask: 'linear-gradient(#000 0 0) top/100% calc(100% - 7px) no-repeat, conic-gradient(from 135deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom/14px 7px repeat-x',
    mask: 'linear-gradient(#000 0 0) top/100% calc(100% - 7px) no-repeat, conic-gradient(from 135deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom/14px 7px repeat-x',
    transform: 'rotate(-1deg)',
  })) satisfies SxProps<Theme>,
  receiptTitle: {
    fontFamily: FONTS.body,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    fontSize: '0.72rem',
    textAlign: 'center',
    pb: 1,
    mb: 1,
    borderBottom: '1px dashed',
    borderColor: 'text.secondary',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 2,
    py: 0.35,
  },
  receiptTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    mt: 1,
    pt: 1,
    borderTop: '1px dashed',
    borderColor: 'text.secondary',
    fontWeight: 700,
  },
  receiptProtein: {
    fontFamily: FONTS.hand,
    fontSize: '1.35rem',
    fontWeight: 700,
    color: 'secondary.main',
    mt: 1.25,
    transform: 'rotate(-2deg)',
  },

  // 4:00 - a short desk routine.
  desk: ((theme) => ({
    width: '100%',
    maxWidth: 340,
    p: 2.25,
    borderRadius: '18px',
    bgcolor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  })) satisfies SxProps<Theme>,
  deskHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    mb: 1.5,
  },
  timer: ((theme) => ({
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    color: theme.palette.info.main,
    border: `3px solid ${theme.palette.info.main}`,
    borderRightColor: alpha(theme.palette.info.main, 0.2),
  })) satisfies SxProps<Theme>,
  deskSteps: {
    listStyle: 'none',
    m: 0,
    p: 0,
    gap: 0.75,
  },
  deskStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  deskIcon: {
    fontSize: 18,
    color: 'info.main',
  },

  // 8:30 - mode tags dropped on the page, and tonight's plan in handwriting.
  evening: {
    width: '100%',
    maxWidth: 380,
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1.25,
  },
  tag:
    (tilt: number, active: boolean): SxProps<Theme> =>
    (theme) => ({
      px: 1.75,
      py: 0.75,
      borderRadius: '999px',
      fontWeight: 700,
      fontSize: '0.88rem',
      transform: `rotate(${tilt}deg)`,
      border: `1.5px solid ${active ? theme.palette.secondary.main : theme.palette.divider}`,
      bgcolor: active ? theme.palette.secondary.main : theme.palette.background.paper,
      color: active ? theme.palette.secondary.contrastText : theme.palette.text.primary,
    }),
  handLine: {
    fontFamily: FONTS.hand,
    fontSize: '1.5rem',
    fontWeight: 600,
    color: 'text.secondary',
    mt: 2,
  },

  // 10:30 - a postcard from four weeks later.
  postcard: ((theme) => ({
    position: 'relative',
    width: '100%',
    maxWidth: 360,
    p: 2.5,
    pr: 9,
    bgcolor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '6px',
    boxShadow: paperShadow(theme),
    transform: 'rotate(-1.5deg)',
  })) satisfies SxProps<Theme>,
  postStamp: ((theme) => ({
    position: 'absolute',
    top: 14,
    right: 14,
    width: 52,
    height: 60,
    p: '5px',
    border: `2px dashed ${theme.palette.divider}`,
    display: 'grid',
    placeItems: 'center',
  })) satisfies SxProps<Theme>,
  postStampImg: {
    width: 38,
    height: 38,
    borderRadius: '8px',
  },
  postTitle: {
    fontFamily: FONTS.display,
    fontStyle: 'italic',
    fontWeight: 600,
    fontSize: '1.5rem',
  },
  spark: {
    display: 'block',
    width: '100%',
    height: 44,
    color: 'success.main',
    my: 1,
  },
  postLine: {
    fontFamily: FONTS.hand,
    fontSize: '1.35rem',
    fontWeight: 600,
    lineHeight: 1.25,
  },
};
