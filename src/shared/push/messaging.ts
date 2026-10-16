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

export async function unregisterFromPush(): Promise<void> {
  try {
    await deleteToken(getMessaging(app))
  } catch (err) {
    // The token may already be gone — from the other end, or a reinstall.
    console.warn('Could not delete push token', err)
  }
}
