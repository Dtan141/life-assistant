import { createContext } from 'react'
import type { User } from 'firebase/auth'

export interface AuthState {
  user: User | null
  /** True until Firebase has restored (or ruled out) a session. */
  loading: boolean
  /** Error code from a redirect sign-in, surfaced because an installed PWA has no console. */
  redirectError: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
