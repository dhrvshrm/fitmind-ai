import type { SxProps, Theme } from '@mui/material';

/** A loose hand-drawn wave, used as a mask so it takes the text's accent color. */
const WAVE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 10' preserveAspectRatio='none'%3E%3Cpath d='M2 6 C 18 1, 30 9, 46 5 S 74 1, 90 5 S 112 9, 118 4' fill='none' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E\")";

/**
 * A hand-drawn underline that draws itself in from the left on hover, and
 * stays when the link is `active` (the section on screen, or the current page).
 */
export function squiggleUnderline(active: boolean): SxProps<Theme> {
  return {
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: -7,
      height: 7,
      bgcolor: 'secondary.main',
      WebkitMask: `${WAVE} center / 100% 100% no-repeat`,
      mask: `${WAVE} center / 100% 100% no-repeat`,
      transform: active ? 'scaleX(1)' : 'scaleX(0)',
      transformOrigin: 'left center',
      transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
    },
    '&:hover::after, &:focus-visible::after': { transform: 'scaleX(1)' },
    '@media (prefers-reduced-motion: reduce)': { '&::after': { transition: 'none' } },
  };
}
