import type { Request } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemberAccess } from '@apitech/contracts'

export interface AuthContext {
  userId: string
  access: MemberAccess
  client: SupabaseClient
}
export interface AuthenticatedRequest extends Request { identity?: AuthContext }
