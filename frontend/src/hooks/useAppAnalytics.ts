import { useEffect } from 'react';
import { trackAppOpenedOnce } from '../lib/analytics';
import { isStandalone } from '../lib/push';
import { useAuthStore } from '../store/authStore';

/** Counts one `app_opened` per session for signed-in users (no personal details are sent). */
export function useAppAnalytics() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) trackAppOpenedOnce(isStandalone());
  }, [token]);
}
