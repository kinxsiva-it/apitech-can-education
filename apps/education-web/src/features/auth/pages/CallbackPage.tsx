import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { AuthCard, Feedback, LoadingCard } from '../components/AuthFrame'

export function CallbackPage() {
  const { linkError, clearLinkError, initialized, session, access, accessLoading, recovery, accessError, refreshAccess } = useAuth()
  if (linkError) return <AuthCard title={linkError === 'expired' ? 'ลิงก์หมดอายุหรือถูกใช้แล้ว' : 'เปิดลิงก์ไม่สำเร็จ'}
    subtitle="หากเคยยืนยันอีเมลแล้ว คุณสามารถเข้าสู่ระบบได้ ไม่จำเป็นต้องกดลิงก์เดิมซ้ำ">
    <div className="auth-actions"><Link className="auth-primary" to="/login" onClick={clearLinkError}>ไปเข้าสู่ระบบ</Link>
      <Link className="auth-secondary" to="/verify-email" onClick={clearLinkError}>ขออีเมลยืนยันใหม่</Link></div>
  </AuthCard>
  if (!initialized || (session && accessLoading && !access && !recovery)) return <LoadingCard text="กำลังตรวจสอบการยืนยันและสิทธิ์สมาชิก…" />
  if (session && recovery) return <Navigate to="/reset-password" replace />
  if (session && access) return <Navigate to={access.can_access_education ? '/learn' : access.email_confirmed ? '/membership' : '/verify-email'} replace />
  return <AuthCard title="กลับเข้าสู่ระบบเพื่อดำเนินการต่อ" subtitle="หากยืนยันอีเมลสำเร็จแล้ว ให้เข้าสู่ระบบด้วยรหัสผ่านที่ตั้งตอนสมัคร">
    {accessError && <><Feedback>{accessError}</Feedback><button className="auth-secondary" onClick={refreshAccess}>ตรวจสอบอีกครั้ง</button></>}
    <Link className="auth-primary" to="/login">เข้าสู่ระบบ</Link>
  </AuthCard>
}
