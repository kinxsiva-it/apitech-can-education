const origin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
export class HttpError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}
export async function api<T>(
  token: string,
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const form = options.body instanceof FormData
  const response = await fetch(`${origin}/api${path}`, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(!form && options.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    body:
      options.body === undefined
        ? undefined
        : form
          ? (options.body as FormData)
          : JSON.stringify(options.body),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
    cache: 'no-store',
    credentials: 'omit',
  })
  if (!response.ok) throw new HttpError(response.status)
  return response.json() as Promise<T>
}
export async function imageBlob(
  token: string,
  id: string,
  signal: AbortSignal,
) {
  const response = await fetch(
    `${origin}/api/media/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      cache: 'no-store',
      credentials: 'omit',
    },
  )
  if (!response.ok) throw new HttpError(response.status)
  return response.blob()
}
export function errorMessage(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 409)
      return 'ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนทำรายการอีกครั้ง'
    if (error.status === 401) return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
    if (error.status === 403)
      return 'บัญชีนี้ไม่มีสิทธิ์ทำรายการ กรุณาตรวจสิทธิ์กับผู้พัฒนา'
    if (error.status === 400 || error.status === 413)
      return 'ข้อมูลหรือรูปภาพไม่ผ่านเงื่อนไข กรุณาตรวจช่องบังคับและขนาดไฟล์'
  }
  return 'เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่ หากยังพบปัญหาให้แจ้งผู้พัฒนา'
}
