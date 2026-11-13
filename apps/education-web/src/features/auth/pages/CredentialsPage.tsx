import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase/client'
import { useAuth } from '../auth-context'
import { authErrorCode, authErrorMessage } from '../auth-links'
import { AuthCard, Feedback } from '../components/AuthFrame'
import { PasswordField } from '../components/PasswordField'
import { InstitutionField } from '../components/InstitutionField'

function CredentialsPage({ register }: { register: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const flash: unknown = location.state?.message
  const { notice, clearLinkError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [institution, setInstitution] = useState('')
  const [other, setOther] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    setError(null)
    if (register && (password !== confirmation || new TextEncoder().encode(password).length > 72)) {
      setError(password !== confirmation ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' : 'รหัสผ่านยาวเกินไป กรุณาใช้ไม่เกิน 72 ไบต์'); return
    }
    if (register && (!name.trim() || (institution === 'other' && !other.trim()))) { setError('กรุณากรอกข้อมูลให้ครบ'); return }
    setBusy(true)
    clearLinkError()
    try {
      if (register) {
        const { error: authError } = await supabase.auth.signUp({ email: email.trim(), password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: {
            full_name: name.trim(), institution_id: institution && institution !== 'other' ? institution : null,
            institution_other: institution === 'other' ? other.trim() : null,
          } } })
        if (authError) throw authError
        setPassword(''); setConfirmation('')
        navigate('/verify-email', { state: { email: email.trim() }, replace: true })
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
        setPassword('')
        // GuestGate redirects only after Members API confirms current access.
      }
    } catch (authError) {
      if (authErrorCode(authError) === 'email_not_confirmed') navigate('/verify-email', { state: { email: email.trim() } })
      else setError(authErrorMessage(authError))
    } finally { setBusy(false) }
  }

  return <AuthCard title={register ? 'สมัครบัญชีอาจารย์' : 'ยินดีต้อนรับกลับ'}
    subtitle={register ? 'ยืนยันอีเมลและรอผู้ดูแลอนุมัติ ก่อนเข้าถึงสื่อการสอนทุกหมวด' : 'เข้าสู่ระบบเพื่อใช้สื่อการสอนและพื้นที่สำรวจระบบ EV'}>
    {notice && <Feedback kind="success">{notice}</Feedback>}
    {typeof flash === 'string' && <Feedback kind="success">{flash}</Feedback>}
    {error && <Feedback>{error}</Feedback>}
    <form onSubmit={submit} className="auth-form" aria-busy={busy}>
      {register && <div className="auth-field"><label htmlFor="full-name">ชื่อ–นามสกุล</label>
        <input id="full-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={200} disabled={busy} /></div>}
      <div className="auth-field"><label htmlFor="email">อีเมล</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required maxLength={254} disabled={busy} /></div>
      <PasswordField label="รหัสผ่าน" value={password} onChange={setPassword} newPassword={register} disabled={busy} />
      {register ? <><PasswordField label="ยืนยันรหัสผ่าน" value={confirmation} onChange={setConfirmation} newPassword disabled={busy} />
        <p className="auth-field-hint">ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร</p>
        <InstitutionField value={institution} onChange={setInstitution} other={other} onOtherChange={setOther} disabled={busy} /></>
        : <Link to="/forgot-password" className="auth-forgot">ลืมรหัสผ่าน?</Link>}
      <button className="auth-primary" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : register ? 'สมัครและรับอีเมลยืนยัน' : 'เข้าสู่ระบบ'}</button>
    </form>
    <p className="auth-switch">{register ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'} <Link to={register ? '/login' : '/register'}>{register ? 'เข้าสู่ระบบ' : 'สมัครบัญชีอาจารย์'}</Link></p>
  </AuthCard>
}
export function LoginPage() { return <CredentialsPage register={false} /> }
export function RegisterPage() { return <CredentialsPage register /> }
