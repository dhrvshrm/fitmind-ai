import { useCallback, useEffect, useState } from 'react';
import { BREAK_CHECK_INTERVAL_MS } from '../constants/activity';
import type { ActivitySettings, DueBreak } from '../types/activity';
import { dueBreak, readLastShownBreak, writeLastShownBreak } from '../utils/activity';

type BreakNotice = { title: string; body: string };

/** True when the browser can show notifications and the user allowed them. */
export function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

/**
 * While the app is open, checks every 30 seconds whether a work-hours break
 * is due. Each slot is shown once per device. When notifications are
 * allowed and the tab is in the background, a browser notification is shown
 * too. Push reminders for a closed app are sent by the backend separately.
 */
export function useBreakReminders(
  settings: ActivitySettings | undefined,
  notice: (due: DueBreak) => BreakNotice,
) {
  const [due, setDue] = useState<DueBreak | null>(null);

  useEffect(() => {
    if (!settings?.break_reminders_enabled) return undefined;

    function check() {
      if (!settings) return;
      const next = dueBreak(settings);
      if (!next || next.key === readLastShownBreak()) return;
      writeLastShownBreak(next.key);
      setDue(next);
      if (canNotify() && document.visibilityState === 'hidden') {
        try {
          const { title, body } = notice(next);
          new Notification(title, { body, tag: next.key });
        } catch {
          // Some browsers only allow notifications from a service worker; the in-app nudge still shows.
        }
      }
    }

    check();
    const id = window.setInterval(check, BREAK_CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [settings, notice]);

  const dismiss = useCallback(() => setDue(null), []);
  return { due: settings?.break_reminders_enabled ? due : null, dismiss };
}
