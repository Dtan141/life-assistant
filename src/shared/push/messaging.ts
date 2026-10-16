import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging'
import { app } from '@/shared/firebase/app'
import { isIOS, isStandalone } from '@/shared/lib/platform'
import { withTimeout } from '@/shared/lib/timeout'

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

  const registration = await withTimeout(
    navigator.serviceWorker.ready,
    8000,
    'Service worker',
  )

  const ask = () =>
    withTimeout(
      getToken(getMessaging(app), {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      }),
      15000,
      'Firebase Messaging',
    )

  try {
    return (await ask()) || null
  } catch (err) {
    console.warn('First getToken attempt failed, clearing subscription', err)
    // Turning reminders off and on again leaves a half-torn-down push
    // subscription that getToken will wait on forever. Clear it and ask once
    // more; a second failure is a real one.
    const existing = await registration.pushManager.getSubscription()
    await existing?.unsubscribe().catch(() => undefined)
    return (await ask()) || null
  }
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
  await withTimeout(deleteToken(getMessaging(app)), timeoutMs, 'Firebase Messaging').catch(
    (err: unknown) => {
      // Best effort only: the Firestore record is what stops the reminders.
      console.warn('Could not revoke push token with FCM', err)
    },
  )

  // Leaving the browser subscription behind is what makes the next getToken()
  // hang, so tear it down whether or not the SDK managed its half.
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const existing = await registration?.pushManager.getSubscription()
    await existing?.unsubscribe()
  } catch (err) {
    console.warn('Could not clear push subscription', err)
  }
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
