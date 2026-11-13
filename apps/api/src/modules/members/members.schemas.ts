import { z } from 'zod'
import { memberStatus } from '../auth/access.schemas.js'

export const profileInput = z.strictObject({
  fullName: z.string().trim().min(1).max(200),
  institutionId: z.uuid().nullable().default(null),
  institutionOther: z.string().trim().min(1).max(200).nullable().default(null),
  expectedRevision: z.number().int().positive(),
}).refine((value) => !(value.institutionId && value.institutionOther), { message: 'Choose an institution or specify another, not both' })
export const submitInput = z.strictObject({ expectedRevision: z.number().int().positive() })
export const reviewInput = z.strictObject({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().min(1).max(2000).nullable().default(null),
  expectedVersion: z.number().int().positive(),
}).refine((value) => value.decision !== 'rejected' || value.reason !== null, { message: 'Rejection reason is required' })
export const statusInput = z.strictObject({
  action: z.enum(['suspend', 'restore']),
  reason: z.string().trim().min(1).max(2000).nullable().default(null),
  expectedVersion: z.number().int().positive(),
}).refine((value) => value.action !== 'suspend' || value.reason !== null, { message: 'Suspension reason is required' })
export const membersQuery = z.strictObject({
  status: memberStatus.optional(), search: z.string().trim().max(200).default(''),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
})
export const uuidInput = z.uuid()
export type ProfileInput = z.infer<typeof profileInput>
export type SubmitInput = z.infer<typeof submitInput>
export type ReviewInput = z.infer<typeof reviewInput>
export type StatusInput = z.infer<typeof statusInput>
export type MembersQuery = z.infer<typeof membersQuery>
