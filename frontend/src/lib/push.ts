import type { PushSubscriptionPayload } from '../types/habit';

/** Why this browser can or can't get reminders right now. */
export type PushSupport = 'supported' | 'unsupported' | 'blocked';

/** True when the browser has everything Web Push needs (service worker, Push API, notifications). */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function pushSupport(): PushSupport {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission === 'denied' ? 'blocked' : 'supported';
}

/** True when the app runs installed (home screen), not in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

/** The VAPID public key (base64url) as the bytes PushManager expects. */
function keyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = `${base64Url}${'='.repeat((4 - (base64Url.length % 4)) % 4)}`;
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ? navigator.serviceWorker.ready : null;
}

/** This device's current push subscription, if any. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

function toPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
  };
}

/**
 * Asks permission (if needed) and subscribes this device. Returns null when
 * permission is refused or the app's service worker isn't running (e.g. dev mode).
 */
export async function subscribeDevice(publicKey: string): Promise<PushSubscriptionPayload | null> {
  if (!isPushSupported()) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  const reg = await registration();
  if (!reg) return null;
  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
  return toPayload(subscription);
}

/** Unsubscribes this device; returns the endpoint that was removed (to tell the server). */
export async function unsubscribeDevice(): Promise<string | null> {
  const subscription = await currentSubscription();
  if (!subscription) return null;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}
