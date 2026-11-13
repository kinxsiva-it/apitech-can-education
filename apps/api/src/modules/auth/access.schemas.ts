import { z } from 'zod'
import type { AdminMember, MemberAccess, MemberProfile, MembershipRequest } from '@apitech/contracts'

export const memberStatus = z.enum(['pending', 'approved', 'rejected', 'suspended'])
export const requestSummary = z.object({
  id: z.uuid(), status: z.enum(['pending', 'approved', 'rejected']),
  round_no: z.number().int().positive(), reason: z.string().nullable(), version: z.number().int().positive(),
})
export const snapshot = z.object({
  full_name: z.string(), institution_id: z.uuid().nullable(),
  institution_name: z.string().nullable(), institution_other: z.string().nullable(),
})
export const accessSchema: z.ZodType<MemberAccess> = z.object({
  user_id: z.uuid(), role: z.enum(['instructor', 'admin']), status: memberStatus,
  version: z.number().int().positive(), email_confirmed: z.boolean(), can_access_education: z.boolean(),
  latest_request: requestSummary.nullable(),
}).refine((value) => value.can_access_education === (value.status === 'approved' && value.email_confirmed))

export const profileSchema: z.ZodType<MemberProfile> = z.object({
  user_id: z.uuid(), full_name: z.string(), institution_id: z.uuid().nullable(), institution_other: z.string().nullable(),
  revision: z.number().int().positive(), created_at: z.string(), updated_at: z.string(),
})
export const membershipRequestSchema: z.ZodType<MembershipRequest> = requestSummary.extend({
  user_id: z.uuid(), profile_snapshot: snapshot, submitted_at: z.string(),
  reviewed_at: z.string().nullable(), reviewed_by: z.uuid().nullable(),
})
export const adminMemberSchema: z.ZodType<AdminMember> = z.object({
  user_id: z.uuid(), full_name: z.string(), email: z.string().nullable(), email_confirmed: z.boolean(),
  institution_name: z.string().nullable(), status: memberStatus,
  access_version: z.number().int().positive(), profile_revision: z.number().int().positive(),
  latest_request: requestSummary.extend({ profile_snapshot: snapshot }).nullable(),
})
export const adminMembersPage = z.object({
  items: z.array(adminMemberSchema), total: z.number().int().nonnegative(),
  limit: z.number().int().positive(), offset: z.number().int().nonnegative(),
})
