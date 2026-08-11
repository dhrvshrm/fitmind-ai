import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { ErrorOutlineRounded } from "@mui/icons-material";
import { STRINGS } from "../../constants/strings";
import { errorBoundaryStyles as styles } from "./ErrorBoundary.styles";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

const S = STRINGS.errorBoundary;

/**
 * Catches render-time errors anywhere in the tree and shows a recoverable
 * fallback instead of a blank white screen. Class component because error
 * boundaries have no hooks equivalent.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface the error for debugging; a real app would report to Sentry etc.
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box sx={styles.root}>
        <Paper elevation={0} sx={styles.card}>
          <ErrorOutlineRounded sx={styles.icon} />
          <Typography variant="h5" sx={styles.title}>
            {S.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={styles.body}>
            {S.body}
          </Typography>
          <Button variant="contained" onClick={this.handleReload}>
            {S.reload}
          </Button>
        </Paper>
      </Box>
    );
  }
}
