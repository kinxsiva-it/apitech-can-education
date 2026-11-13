export function readAuthLink(location: Pick<Location, 'hash' | 'search'>) {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(location.search)
  const code = hash.get('error_code') ?? query.get('error_code')
  return {
    error: hash.has('error') || query.has('error') ? (code === 'otp_expired' ? 'expired' : 'invalid') : null,
    recovery: hash.get('type') === 'recovery' || query.get('type') === 'recovery',
  }
}

export function authErrorCode(error: unknown): string | null {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : null
}

export function authErrorMessage(error: unknown): string {
  switch (authErrorCode(error)) {
    case 'invalid_credentials': return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาใช้รหัสผ่านที่ตั้งสำหรับเว็บนี้'
    case 'email_not_confirmed': return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ'
    case 'weak_password': return 'รหัสผ่านยังไม่ผ่านเงื่อนไข กรุณาเพิ่มความยาวและความหลากหลายของตัวอักษร'
    case 'over_email_send_rate_limit': case 'over_request_rate_limit': return 'ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'
    case 'email_address_not_authorized': return 'ระบบยังส่งอีเมลไปยังที่อยู่นี้ไม่ได้ กรุณาติดต่อผู้ดูแล'
    case 'user_already_exists': return 'กรุณาลองเข้าสู่ระบบหรือใช้เมนูลืมรหัสผ่าน'
    default: return 'ทำรายการไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่ หากยังพบปัญหาให้ติดต่อผู้ดูแล'
  }
}
