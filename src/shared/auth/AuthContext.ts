import { createContext } from 'react'
import type { User } from 'firebase/auth'

export interface AuthState {
  user: User | null
  /** True until Firebase has restored (or ruled out) a session. */
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
