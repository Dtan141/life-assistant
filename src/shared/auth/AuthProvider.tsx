import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '@/shared/firebase/app'
import { ensureUserProfile } from '@/shared/auth/user.repo'
import { isIOS, isStandalone } from '@/shared/lib/platform'
import { AuthContext } from '@/shared/auth/AuthContext'

const provider = new GoogleAuthProvider()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setLoading(false)
      if (next) {
        // Fire and forget: a failure here must not block sign-in, and the
        // profile is re-checked on every subsequent sign-in anyway.
        void ensureUserProfile(next).catch((err) =>
          console.error('Failed to create user profile', err),
        )
      }
    })
  }, [])

  const signIn = useCallback(async () => {
    // An installed iOS PWA has no popup window to return to, so the popup
    // flow dead-ends there. Redirect is the only reliable path.
    if (isIOS() && isStandalone()) {
      await signInWithRedirect(auth, provider)
      return
    }
    await signInWithPopup(auth, provider)
  }, [])

  const signOut = useCallback(async () => {
    await fbSignOut(auth)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
