import { Injectable } from '@nestjs/common'
import { z } from 'zod'
import { SupabaseGateway } from '../auth/supabase.gateway.js'
import { adminMembersPage, memberStatus, membershipRequestSchema, profileSchema } from '../auth/access.schemas.js'
import type { AuthContext } from '../auth/auth.types.js'
import type { MembersQuery, ProfileInput, ReviewInput, StatusInput } from './members.schemas.js'

@Injectable()
export class MembersService {
  constructor(private readonly gateway: SupabaseGateway) {}

  async profile(member: AuthContext) {
    const { data, error, status } = await member.client.from('profiles')
      .select('user_id,full_name,institution_id,institution_other,revision,created_at,updated_at').eq('user_id', member.userId).maybeSingle()
    if (error) this.gateway.fail(error, status)
    return this.gateway.parse(data, profileSchema)
  }

  updateProfile(member: AuthContext, input: ProfileInput) {
    return this.gateway.rpc(member.client, 'update_my_profile', {
      p_full_name: input.fullName, p_institution_id: input.institutionId,
      p_institution_other: input.institutionOther, p_expected_revision: input.expectedRevision,
    }, profileSchema, true)
  }

  async submit(member: AuthContext, expectedRevision: number) {
    const requestId = await this.gateway.rpc(member.client, 'submit_membership_request', { p_expected_revision: expectedRevision }, z.uuid())
    return { request_id: requestId }
  }

  async requests(member: AuthContext, query: MembersQuery) {
    // RLS is retained, but the explicit owner filter also limits the result for an Admin's /me route.
    const { data, error, status, count } = await member.client.from('membership_requests')
      .select('id,user_id,round_no,profile_snapshot,status,submitted_at,reviewed_at,reviewed_by,reason,version', { count: 'exact' })
      .eq('user_id', member.userId).order('round_no', { ascending: false }).range(query.offset, query.offset + query.limit - 1)
    if (error) this.gateway.fail(error, status)
    return { items: this.gateway.parse(data, z.array(membershipRequestSchema)), total: this.gateway.parse(count, z.number().int().nonnegative()), limit: query.limit, offset: query.offset }
  }

  list(member: AuthContext, query: MembersQuery) {
    return this.gateway.rpc(member.client, 'list_members_for_admin', {
      p_status: query.status ?? null, p_search: query.search, p_limit: query.limit, p_offset: query.offset,
    }, adminMembersPage)
  }

  review(member: AuthContext, requestId: string, input: ReviewInput) {
    return this.gateway.rpc(member.client, 'review_membership_request', {
      p_request_id: requestId, p_decision: input.decision, p_reason: input.reason, p_expected_version: input.expectedVersion,
    }, membershipRequestSchema, true)
  }

  changeStatus(member: AuthContext, userId: string, input: StatusInput) {
    return this.gateway.rpc(member.client, 'change_member_status', {
      p_user_id: userId, p_action: input.action, p_reason: input.reason, p_expected_version: input.expectedVersion,
    }, z.object({ user_id: z.uuid(), role: z.enum(['instructor', 'admin']), status: memberStatus,
      version: z.number().int().positive(), changed_at: z.string() }), true)
  }
}
