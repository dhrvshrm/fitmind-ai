import { useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';
import { useWebSocket } from './useWebSocket';
import { useUiStore } from '../store/uiStore';
import { notificationService } from '../services/notificationService';
import { getChatSocketUrl } from '../constants/api';
import { TOAST_NOTIFICATION_TYPES } from '../constants/notification';
import type { ClientFrame, ServerFrame } from '../types/chat';
import type { AppNotification } from '../types/notification';

/** Shows a toast for a live-pushed notification, styled by its type. */
function showNotificationToast(notification: AppNotification) {
  if (notification.type === 'streak_warning') {
    toast(notification.message, { icon: '🔥' });
  } else {
    toast.success(notification.message);
  }
}

/**
 * Loads the user's notifications on app start and keeps them live over the
 * same `/ws/{user_id}` channel the AI coach uses (the backend fans out
 * `notification` frames to every connection a user has open, so this works
 * independently of whether the coach page is mounted).
 *
 * Call this once (from `Navbar`, which lives for the whole authenticated
 * session) — it writes into the shared `uiStore`, not local state.
 */
export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const setNotifications = useUiStore((s) => s.setNotifications);
  const addNotification = useUiStore((s) => s.addNotification);
  const markOneReadInStore = useUiStore((s) => s.markOneRead);
  const markAllReadInStore = useUiStore((s) => s.markAllRead);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await notificationService.getNotifications();
      setNotifications(result.notifications, result.unread_count);
    } catch {
      // Non-fatal: the bell just stays at its last-known count.
    }
  }, [userId, setNotifications]);

  useEffect(() => {
    // Deferred so the effect body itself schedules no state updates synchronously.
    queueMicrotask(() => {
      loadNotifications();
    });
  }, [loadNotifications]);

  const handleFrame = useCallback(
    (frame: ServerFrame) => {
      if (frame.type !== 'notification') return;
      addNotification(frame.data);
      if (TOAST_NOTIFICATION_TYPES.has(frame.data.type)) {
        showNotificationToast(frame.data);
      }
    },
    [addNotification],
  );

  useWebSocket<ServerFrame, ClientFrame>({
    url: userId ? getChatSocketUrl(userId) : null,
    onMessage: handleFrame,
  });

  async function markAllAsRead() {
    const unreadIds = useUiStore
      .getState()
      .notifications.filter((n) => !n.read)
      .map((n) => n.id);
    // Optimistic: the drawer reflects "read" immediately regardless of network speed.
    markAllReadInStore();
    await Promise.allSettled(unreadIds.map((id) => notificationService.markRead(id)));
  }

  async function markAsRead(id: string) {
    markOneReadInStore(id);
    try {
      await notificationService.markRead(id);
    } catch {
      // Non-fatal: worst case it shows unread again after the next reload.
    }
  }

  return { markAllAsRead, markAsRead };
}
