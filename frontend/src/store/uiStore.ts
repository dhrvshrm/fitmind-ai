import { create } from 'zustand';
import type { AppNotification } from '../types/notification';

type UiState = {
  notifications: AppNotification[];
  /** Unread count, tracked separately so it can be set directly from the API's count. */
  notificationCount: number;

  setNotifications: (notifications: AppNotification[], unreadCount: number) => void;
  /** Prepends a live-pushed notification and bumps the unread count. */
  addNotification: (notification: AppNotification) => void;
  markOneRead: (id: string) => void;
  markAllRead: () => void;
};

/**
 * UI-only store for cross-page state that isn't part of auth — currently just
 * notifications (loaded once via REST on app start, then kept live over the
 * WebSocket by `useNotifications`).
 */
export const useUiStore = create<UiState>()((set) => ({
  notifications: [],
  notificationCount: 0,

  setNotifications: (notifications, unreadCount) =>
    set({ notifications, notificationCount: unreadCount }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      notificationCount: state.notificationCount + (notification.read ? 0 : 1),
    })),

  markOneRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      if (!target || target.read) return state;
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
        notificationCount: Math.max(0, state.notificationCount - 1),
      };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      notificationCount: 0,
    })),
}));
