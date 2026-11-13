import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { MemberAccess } from '@apitech/contracts'
interface AdminAuth {
  initialized: boolean
  session: Session | null
  access: MemberAccess | null
  checking: boolean
  error: string | null
  refresh(): void
  logout(): Promise<void>
}
export const AdminContext = createContext<AdminAuth | null>(null)
export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) throw new Error('AdminProvider required')
  return context
}
