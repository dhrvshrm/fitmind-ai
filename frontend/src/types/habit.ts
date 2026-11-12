/** Phase 7: Today status, reminders, analytics and instant setup. */

export type SetupStatus = 'created' | 'pending' | 'failed';

/** `POST /users/onboarding?setup=true` -> data.setup */
export type SetupResult = {
  meal_plan: SetupStatus;
  workout_plan: SetupStatus;
};

export type RestartStatus = {
  show: boolean;
  missed_days: number;
  last_log_date: string | null;
};

/** `GET /today/status` -> data */
export type TodayStatus = {
  date: string;
  restart: RestartStatus;
  recovery_checked_in: boolean;
  push_available: boolean;
  push_subscribed: boolean;
};

export type ReminderSettings = {
  enabled: boolean;
  meals: boolean;
  workout: boolean;
  water: boolean;
  comeback: boolean;
  /** Local "HH:MM", or null to follow the usual workout time. */
  workout_time: string | null;
  water_time: string;
};

export type ReminderToggle = 'meals' | 'workout' | 'water' | 'comeback';

/** `GET /reminders` -> data */
export type ReminderState = {
  settings: ReminderSettings;
  push_available: boolean;
  public_key: string | null;
  subscribed: boolean;
};

export type ReminderSettingsUpdate = Partial<ReminderSettings>;

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Events the app is allowed to send; everything else is recorded by the server. */
export type ClientEventName =
  | 'app_opened'
  | 'today_viewed'
  | 'app_installed'
  | 'reminder_opened'
  | 'restart_action';

export type ClientEventProperties = Record<string, string | number | boolean>;
