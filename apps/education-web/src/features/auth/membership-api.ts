import type { InstitutionOption, MemberAccess, MemberProfile } from '@apitech/contracts'

const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
export class ApiError extends Error {
  readonly status: number
  constructor(status: number) { super(`API ${status}`); this.status = status }
}

async function request(path: string, token?: string, signal?: AbortSignal, body?: unknown) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 15000)
  try {
    const response = await fetch(`${apiOrigin}/api${path}`, {
      method: body === undefined ? 'GET' : path.endsWith('/profile') ? 'PATCH' : 'POST',
      credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) throw new ApiError(response.status)
    return await response.json() as unknown
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

export function parseMemberAccess(value: unknown): MemberAccess {
  if (!value || typeof value !== 'object') throw new ApiError(503)
  const row = value as Partial<MemberAccess>
  if (typeof row.user_id !== 'string' || !['instructor', 'admin'].includes(row.role ?? '')
    || !['pending', 'approved', 'rejected', 'suspended'].includes(row.status ?? '')
    || typeof row.email_confirmed !== 'boolean' || typeof row.can_access_education !== 'boolean'
    || !Number.isInteger(row.version) || (row.version ?? 0) < 1
    || row.can_access_education !== (row.status === 'approved' && row.email_confirmed)
    || row.latest_request === undefined) throw new ApiError(503)
  if (row.latest_request !== null) {
    const latest = row.latest_request
    if (!latest || typeof latest !== 'object' || typeof latest.id !== 'string'
      || !['pending', 'approved', 'rejected'].includes(latest.status)
      || !Number.isInteger(latest.round_no) || latest.round_no < 1
      || !Number.isInteger(latest.version) || latest.version < 1
      || !(latest.reason === null || typeof latest.reason === 'string')) throw new ApiError(503)
  }
  return row as MemberAccess
}

function parseProfile(value: unknown): MemberProfile {
  if (!value || typeof value !== 'object') throw new ApiError(503)
  const row = value as Partial<MemberProfile>
  if (typeof row.user_id !== 'string' || typeof row.full_name !== 'string'
    || !Number.isInteger(row.revision) || (row.revision ?? 0) < 1
    || !(row.institution_id === null || typeof row.institution_id === 'string')
    || !(row.institution_other === null || typeof row.institution_other === 'string')) throw new ApiError(503)
  return row as MemberProfile
}

export async function getMemberAccess(token: string, signal?: AbortSignal) {
  return parseMemberAccess(await request('/members/me', token, signal))
}
export async function getMyProfile(token: string, signal?: AbortSignal) {
  return parseProfile(await request('/members/me/profile', token, signal))
}
export async function updateMyProfile(token: string, data: { fullName: string; institutionId: string | null; institutionOther: string | null; expectedRevision: number }) {
  return parseProfile(await request('/members/me/profile', token, undefined, data))
}
export async function submitRequest(token: string, expectedRevision: number) {
  return request('/members/me/requests', token, undefined, { expectedRevision })
}
export async function getInstitutions(search: string, signal?: AbortSignal): Promise<InstitutionOption[]> {
  const data = await request(`/institutions?limit=50&search=${encodeURIComponent(search)}`, undefined, signal)
  if (!Array.isArray(data) || !data.every((row: unknown) => row && typeof row === 'object' && 'id' in row && 'name' in row
    && typeof row.id === 'string' && typeof row.name === 'string')) throw new ApiError(503)
  return data as InstitutionOption[]
}
export function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'ข้อมูลหรือสถานะเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนลองใหม่'
    if (error.status === 401) return 'เซสชันใช้ไม่ได้หรือหมดอายุ กรุณาเข้าสู่ระบบใหม่'
    if (error.status === 403) return 'บัญชีนี้ยังไม่มีสิทธิ์ทำรายการนี้'
    if (error.status === 400) return 'กรุณาตรวจข้อมูลที่กรอกและลองใหม่'
  }
  return 'ติดต่อระบบไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'
}
