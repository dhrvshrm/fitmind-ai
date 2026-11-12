import type { ComponentType, ReactNode } from 'react';
import { Box, Button, CircularProgress, Typography, type SvgIconProps } from '@mui/material';
import { nudgeBannerStyles as styles, type NudgeTone } from './NudgeBanner.styles';

type NudgeBannerProps = {
  icon: ComponentType<SvgIconProps>;
  title: string;
  body?: ReactNode;
  tone?: NudgeTone;
  actionLabel?: string;
  onAction?: () => void;
  /** Shows a spinner on the action and disables it. */
  busy?: boolean;
  dismissLabel?: string;
  onDismiss?: () => void;
};

/** A soft, one-line prompt with one main action (fresh start, reminders, install, check-in). */
export function NudgeBanner({
  icon: Icon,
  title,
  body,
  tone = 'primary',
  actionLabel,
  onAction,
  busy = false,
  dismissLabel,
  onDismiss,
}: NudgeBannerProps) {
  return (
    <Box component="aside" aria-label={title} sx={styles.root(tone)}>
      <Box sx={styles.row}>
        <Box sx={styles.icon(tone)}>
          <Icon fontSize="small" />
        </Box>
        <Box sx={styles.text}>
          <Typography variant="body1" sx={styles.title}>
            {title}
          </Typography>
          {body && (
            <Typography variant="body2" sx={styles.body}>
              {body}
            </Typography>
          )}
        </Box>
      </Box>
      {(actionLabel || dismissLabel) && (
        <Box sx={styles.actions}>
          {dismissLabel && onDismiss && (
            <Button color="inherit" onClick={onDismiss}>
              {dismissLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button
              variant="contained"
              color={tone}
              onClick={onAction}
              disabled={busy}
              sx={styles.primaryButton}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {actionLabel}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}
