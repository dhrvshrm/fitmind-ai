import { apiClient } from '../lib/apiClient';
import {
  ANALYTICS_ENDPOINTS,
  REMINDER_ENDPOINTS,
  TODAY_ENDPOINTS,
  USER_ENDPOINTS,
} from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  ClientEventName,
  ClientEventProperties,
  PushSubscriptionPayload,
  ReminderSettingsUpdate,
  ReminderState,
  SetupResult,
  TodayStatus,
} from '../types/habit';
import type { OnboardingPayload, OnboardingResultData } from '../types/onboarding';

export type OnboardingWithSetupResult = OnboardingResultData & { setup: SetupResult | null };

/** Today, reminders, analytics and instant setup. Unwraps the `{ success, message, data }` envelope. */
export const habitService = {
  async todayStatus(): Promise<TodayStatus> {
    const { data } = await apiClient.get<ApiEnvelope<TodayStatus>>(TODAY_ENDPOINTS.STATUS);
    return data.data;
  },

  /** First-time onboarding: saves answers, then builds the meal and workout plans. */
  async completeOnboardingWithSetup(payload: OnboardingPayload): Promise<OnboardingWithSetupResult> {
    const { data } = await apiClient.post<ApiEnvelope<OnboardingWithSetupResult>>(
      USER_ENDPOINTS.ONBOARDING,
      payload,
      { params: { setup: true } },
    );
    return data.data;
  },

  async getReminders(): Promise<ReminderState> {
    const { data } = await apiClient.get<ApiEnvelope<ReminderState>>(REMINDER_ENDPOINTS.STATE);
    return data.data;
  },

  async updateReminders(changes: ReminderSettingsUpdate): Promise<ReminderState> {
    const { data } = await apiClient.put<ApiEnvelope<ReminderState>>(REMINDER_ENDPOINTS.STATE, changes);
    return data.data;
  },

  async subscribe(subscription: PushSubscriptionPayload): Promise<ReminderState> {
    const { data } = await apiClient.post<ApiEnvelope<ReminderState>>(
      REMINDER_ENDPOINTS.SUBSCRIBE,
      subscription,
    );
    return data.data;
  },

  async unsubscribe(endpoint: string): Promise<ReminderState> {
    const { data } = await apiClient.post<ApiEnvelope<ReminderState>>(REMINDER_ENDPOINTS.UNSUBSCRIBE, {
      endpoint,
    });
    return data.data;
  },

  /** Sends a test reminder; returns how many devices accepted it. */
  async sendTest(): Promise<number> {
    const { data } = await apiClient.post<ApiEnvelope<{ delivered: number }>>(REMINDER_ENDPOINTS.TEST);
    return data.data.delivered;
  },

  async trackEvent(event: ClientEventName, properties?: ClientEventProperties): Promise<void> {
    await apiClient.post(ANALYTICS_ENDPOINTS.EVENTS, { event, properties });
  },
};
