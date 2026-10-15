import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/shared/firebase/app'
import { DEFAULT_SETTINGS } from '@/shared/types'

export function userDoc(uid: string) {
  return doc(db, 'users', uid)
}

/**
 * Creates users/{uid} on first sign-in. Existing profiles are left alone so a
 * later sign-in never overwrites settings the user has changed.
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = userDoc(user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return

  await setDoc(ref, {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
    settings: {
      ...DEFAULT_SETTINGS,
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone ?? DEFAULT_SETTINGS.timezone,
    },
  })
}
