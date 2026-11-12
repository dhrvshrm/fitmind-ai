import { habitService } from '../services/habitService';
import type { ClientEventName, ClientEventProperties } from '../types/habit';

/**
 * Sends a product event (what was done, never health values). Fire and
 * forget: analytics must never slow down or break the app.
 */
export function trackEvent(event: ClientEventName, properties?: ClientEventProperties): void {
  habitService.trackEvent(event, properties).catch(() => undefined);
}

const SESSION_FLAG = 'fitmind-app-opened';

/** Records `app_opened` once per browser session. */
export function trackAppOpenedOnce(standalone: boolean): void {
  try {
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {
    // Storage blocked (private mode): still count the open.
  }
  trackEvent('app_opened', { standalone });
}
