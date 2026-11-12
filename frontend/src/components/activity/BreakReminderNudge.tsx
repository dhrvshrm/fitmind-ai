import { useCallback } from 'react';
import { Alert, AlertTitle, Button, Snackbar, Stack } from '@mui/material';
import { SelfImprovementRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import { ROUTINE_QUERY_PARAM } from '../../constants/activity';
import { ROUTES } from '../../constants/routes';
import { useActivitySettings } from '../../hooks/queries/useActivityQueries';
import { useBreakReminders } from '../../hooks/useBreakReminders';
import type { DueBreak } from '../../types/activity';
import { breakReminderNudgeStyles as styles } from './BreakReminderNudge.styles';

const B = ACTIVITY_STRINGS.breaks;

/**
 * In-app nudge to take a break during work hours (plus a browser
 * notification when allowed and the tab is in the background). Mounted once
 * in the app shell; does nothing until reminders are switched on.
 */
export function BreakReminderNudge() {
  const settings = useActivitySettings();
  const navigate = useNavigate();
  const notice = useCallback(
    (due: DueBreak) => ({ title: B.nudgeTitle, body: B.nudgeBody(due.minutes) }),
    [],
  );
  const { due, dismiss } = useBreakReminders(settings.data, notice);

  function start() {
    if (!due) return;
    navigate(`${ROUTES.ACTIVITY}?${ROUTINE_QUERY_PARAM}=${encodeURIComponent(due.routineId)}`);
    dismiss();
  }

  return (
    <Snackbar open={Boolean(due)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={styles.snackbar}>
      <Alert
        severity="info"
        icon={<SelfImprovementRounded />}
        onClose={dismiss}
        sx={styles.alert}
        action={
          <Stack sx={styles.actions}>
            <Button size="small" variant="contained" onClick={start}>
              {B.nudgeStart}
            </Button>
            <Button size="small" color="inherit" onClick={dismiss}>
              {B.nudgeLater}
            </Button>
          </Stack>
        }
      >
        <AlertTitle>{B.nudgeTitle}</AlertTitle>
        {due ? B.nudgeBody(due.minutes) : null}
      </Alert>
    </Snackbar>
  );
}
