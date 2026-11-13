/** Type-only API contracts. Never export database clients or server secrets here. */
export interface HealthResponse {
  status: 'ok'
  service: 'apitech-api'
}

export type MemberRole = 'instructor' | 'admin'
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface RequestSummary {
  id: string
  status: RequestStatus
  round_no: number
  reason: string | null
  version: number
}

export interface MemberAccess {
  user_id: string
  role: MemberRole
  status: MemberStatus
  version: number
  email_confirmed: boolean
  can_access_education: boolean
  latest_request: RequestSummary | null
}

export interface MemberProfile {
  user_id: string
  full_name: string
  institution_id: string | null
  institution_other: string | null
  revision: number
  created_at: string
  updated_at: string
}

export interface ProfileSnapshot {
  full_name: string
  institution_id: string | null
  institution_name: string | null
  institution_other: string | null
}

export interface MembershipRequest extends RequestSummary {
  user_id: string
  profile_snapshot: ProfileSnapshot
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface InstitutionOption { id: string; name: string }

export interface AdminMember {
  user_id: string
  full_name: string
  email: string | null
  email_confirmed: boolean
  institution_name: string | null
  status: MemberStatus
  access_version: number
  profile_revision: number
  latest_request: (RequestSummary & { profile_snapshot: ProfileSnapshot }) | null
}

export interface Page<T> { items: T[]; total: number; limit: number; offset: number }
