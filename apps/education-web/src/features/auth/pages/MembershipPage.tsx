import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { AuthCard, Feedback } from '../components/AuthFrame'
import { ProfileRequestForm } from '../components/ProfileRequestForm'
import { SignOutButton } from '../components/SignOutButton'

export function MembershipPage() {
  const { access, session, refreshAccess } = useAuth()
  if (!access) return null
  if (access.can_access_education) return <Navigate to="/learn" replace />
  const rejected = access.status === 'rejected'
  const suspended = access.status === 'suspended'
  const incomplete = access.status === 'pending' && !access.latest_request
  const editable = rejected || incomplete
  return <AuthCard title={suspended ? 'บัญชีถูกระงับสิทธิ์' : rejected ? 'คำขอยังไม่ผ่านการอนุมัติ' : incomplete ? 'เตรียมข้อมูลสำหรับคำขอ' : 'รอผู้ดูแลอนุมัติ'}
    label="MEMBERSHIP STATUS" subtitle={suspended ? 'กรุณาติดต่อผู้ดูแลเพื่อสอบถามการคืนสิทธิ์เข้าใช้งาน' : rejected ? 'ตรวจเหตุผลและแก้ไขข้อมูล แล้วส่งคำขอพิจารณาใหม่จากบัญชีเดิมได้' : incomplete ? 'กรอกข้อมูลด้านล่างก่อนส่งให้ผู้ดูแลพิจารณา' : 'ยืนยันอีเมลแล้ว ผู้ดูแลจะตรวจคำขอก่อนเปิดสิทธิ์สื่อการสอนให้ทุกหมวด'}>
    <div className={`auth-status-badge ${suspended || rejected ? 'warning' : ''}`}>{suspended ? 'ระงับการใช้งาน' : rejected ? 'ต้องแก้ไขข้อมูล' : 'รอการพิจารณา'}</div>
    <p className="auth-account-email">{session?.user.email}</p>
    {rejected && access.latest_request?.reason && <Feedback>{access.latest_request.reason}</Feedback>}
    {access.latest_request && <p className="auth-field-hint">คำขอรอบที่ {access.latest_request.round_no}</p>}
    {editable ? <ProfileRequestForm /> : !suspended && <button className="auth-primary" onClick={refreshAccess}>ตรวจสถานะล่าสุด</button>}
    <div className="auth-actions"><SignOutButton /></div>
  </AuthCard>
}
