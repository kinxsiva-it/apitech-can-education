import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { MemberAccess } from '@apitech/contracts'

export interface AuthState {
  initialized: boolean
  configured: boolean
  session: Session | null
  access: MemberAccess | null
  accessLoading: boolean
  accessError: string | null
  notice: string | null
  recovery: boolean
  linkError: string | null
  signOut(): Promise<void>
  refreshAccess(): void
  clearLinkError(): void
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}
