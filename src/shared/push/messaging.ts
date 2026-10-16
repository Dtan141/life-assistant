import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging'
import { app } from '@/shared/firebase/app'
import { isIOS, isStandalone } from '@/shared/lib/platform'

export type PushBlocker =
  | 'ios-needs-install'
  | 'unsupported'
  | 'denied'
  | null

/**
 * Why push cannot be switched on here, or null if it can.
 *
 * Checked before asking for permission: on iOS the prompt simply never appears
 * outside an installed app, and a button that silently does nothing is worse
 * than one that explains itself.
 */
export async function findPushBlocker(): Promise<PushBlocker> {
  if (isIOS() && !isStandalone()) return 'ios-needs-install'
  if (!('Notification' in window) || !(await isSupported())) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return null
}

export function hasPushPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Asks for permission if needed and returns the device token.
 *
 * The app's own service worker is passed in explicitly; left to itself the SDK
 * registers a second worker for firebase-messaging-sw.js, and two workers on
 * one page is exactly what src/sw.ts exists to avoid.
 */
export async function registerForPush(): Promise<string | null> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.ready
  const token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
  return token || null
}

/**
 * Revokes the token with FCM.
 *
 * Given its own timeout because deleteToken() can hang rather than reject when
 * the subscription is already gone — after a reinstall, or a token revoked
 * from another device. Either way the local record is what the UI reflects, so
 * a stuck SDK call must not freeze the switch.
 */
export async function unregisterFromPush(timeoutMs = 4000): Promise<void> {
  const revoke = deleteToken(getMessaging(app)).catch((err: unknown) => {
    console.warn('Could not delete push token', err)
  })
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
  await Promise.race([revoke, timeout])
}

const TOKEN_KEY = 'life-assistant:push-token'

/**
 * Remembers which token belongs to this device, so turning reminders off after
 * a reload still knows which record to remove. Per-device by nature, which is
 * exactly what localStorage is for.
 */
export function rememberToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private mode, or storage disabled. The switch still works this session.
  }
}

export function recallToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
