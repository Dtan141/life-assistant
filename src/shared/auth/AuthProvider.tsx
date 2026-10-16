import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '@/shared/firebase/app'
import { ensureUserProfile } from '@/shared/auth/user.repo'
import { ensureCatalog } from '@/modules/flashcards/data/catalog.repo'
import { isIOS, isStandalone } from '@/shared/lib/platform'
import { AuthContext } from '@/shared/auth/AuthContext'

const provider = new GoogleAuthProvider()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirectError, setRedirectError] = useState<string | null>(null)

  useEffect(() => {
    // Coming back from a redirect, onAuthStateChanged fires null before
    // Firebase has consumed the redirect result. Clearing `loading` on that
    // first null would bounce the user straight back to the sign-in screen,
    // so hold until both have settled.
    let redirectSettled = false
    let authSettled = false
    const settle = () => {
      if (redirectSettled && authSettled) setLoading(false)
    }

    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next)
      authSettled = true
      settle()
      if (next) {
        // Fire and forget: a failure here must not block sign-in, and both are
        // re-checked on every subsequent sign-in anyway.
        void ensureUserProfile(next)
          // Seeded after the profile exists, since it records the version it
          // received on that same document.
          .then(() => ensureCatalog(next.uid))
          .catch((err) => console.error('Failed to prepare account', err))
      }
    })

    getRedirectResult(auth)
      .catch((err: { code?: string; message?: string }) => {
        console.error('Redirect sign-in failed', err)
        // There is no console on an installed iPhone PWA, so this has to
        // reach the screen to be diagnosable at all.
        setRedirectError(err.code ?? err.message ?? 'unknown')
      })
      .finally(() => {
        redirectSettled = true
        settle()
      })

    return unsubscribe
  }, [])

  const signIn = useCallback(async () => {
    setRedirectError(null)
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
    () => ({ user, loading, redirectError, signIn, signOut }),
    [user, loading, redirectError, signIn, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
