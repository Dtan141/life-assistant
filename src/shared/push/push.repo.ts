import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/shared/firebase/app'
import { now } from '@/shared/firebase/convert'

export const pushTokensCol = (uid: string) => collection(db, 'users', uid, 'pushTokens')

/** A short, stable label so a token list is readable when pruning later. */
function describeDevice(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'iPhone/iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Khác'
}

/**
 * Stores the token under its own value as the document id, so re-registering
 * the same device updates one row instead of growing the list every launch.
 */
export async function savePushToken(uid: string, token: string): Promise<void> {
  await setDoc(
    doc(pushTokensCol(uid), token),
    {
      token,
      device: describeDevice(),
      createdAt: now(),
      lastSeenAt: now(),
    },
    { merge: true },
  )
}

export async function deletePushToken(uid: string, token: string): Promise<void> {
  await deleteDoc(doc(pushTokensCol(uid), token))
}

export async function countPushTokens(uid: string): Promise<number> {
  const snap = await getDocs(pushTokensCol(uid))
  return snap.size
}
