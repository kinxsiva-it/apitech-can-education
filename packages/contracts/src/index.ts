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

export interface Institution extends InstitutionOption { is_active: boolean; version: number; created_at: string; updated_at: string }
export interface AdminNotification { id: string; request_id: string; created_at: string; read_at: string | null }
export interface AuditEntry { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string; before_data: unknown; after_data: unknown; created_at: string }
export type ContentCollection = 'education' | 'components'
export interface ContentBlock { id: string; type: 'text' | 'heading' | 'image'; text: string; assetId: string | null; alt: string }
export interface ContentTopic { id: string; title: string; blocks: ContentBlock[] }
export interface ContentLesson { id: string; title: string; summary: string; topics: ContentTopic[] }
export interface ContentDocument { lessons: ContentLesson[] }
export interface ContentVersion { id: number; collection_key: ContentCollection; document: ContentDocument; created_by: string; created_at: string }
export interface ContentState { key: ContentCollection; version: number; draft: ContentVersion | null; published: ContentVersion | null }
