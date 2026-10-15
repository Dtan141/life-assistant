import type { ReactNode } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { Spinner } from '@/shared/ui/Spinner'
import SignInPage from '@/app/SignInPage'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  // Without this gate the sign-in screen flashes on every reload while
  // Firebase restores the session from storage.
  if (loading) return <Spinner />
  if (!user) return <SignInPage />
  return <>{children}</>
}
