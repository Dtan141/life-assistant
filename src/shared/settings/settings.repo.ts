import { onSnapshot, updateDoc } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { userDoc } from '@/shared/auth/user.repo'
import { toNum, toStr } from '@/shared/firebase/convert'
import { DEFAULT_SETTINGS } from '@/shared/types'
import type { UserSettings } from '@/shared/types'

function settingsFromDoc(data: unknown): UserSettings {
  const raw = (data as { settings?: Record<string, unknown> } | undefined)?.settings ?? {}
  return {
    newPerDay: Math.max(0, toNum(raw.newPerDay, DEFAULT_SETTINGS.newPerDay)),
    maxReviewsPerDay: Math.max(
      0,
      toNum(raw.maxReviewsPerDay, DEFAULT_SETTINGS.maxReviewsPerDay),
    ),
    // Outside 0.7-0.98 FSRS produces intervals that are not useful.
    desiredRetention: clamp(
      toNum(raw.desiredRetention, DEFAULT_SETTINGS.desiredRetention),
      0.7,
      0.98,
    ),
    reminderTime: toStr(raw.reminderTime) || DEFAULT_SETTINGS.reminderTime,
    timezone: toStr(raw.timezone) || DEFAULT_SETTINGS.timezone,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function watchSettings(
  uid: string,
  onChange: (settings: UserSettings) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userDoc(uid),
    (snap) => onChange(settingsFromDoc(snap.data())),
    onError,
  )
}

export async function updateSettings(
  uid: string,
  patch: Partial<UserSettings>,
): Promise<void> {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) data[`settings.${key}`] = value
  }
  if (Object.keys(data).length === 0) return
  await updateDoc(userDoc(uid), data)
}
