import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase/client'
import { useAuth } from '../auth-context'
import { authErrorMessage } from '../auth-links'
import { AuthCard, Feedback, LoadingCard } from '../components/AuthFrame'
import { PasswordField } from '../components/PasswordField'

export function ResetPasswordPage() {
  const { initialized, session, recovery, linkError, signOut, clearLinkError } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!initialized) return <LoadingCard text="กำลังตรวจลิงก์ตั้งรหัสผ่าน…" />
  if (!session || !recovery || linkError) return <AuthCard title="กรุณาเปิดลิงก์ตั้งรหัสผ่านล่าสุด" subtitle="ลิงก์อาจหมดอายุหรือถูกใช้แล้ว คุณสามารถขอลิงก์ใหม่ได้">
    <Link className="auth-primary" to="/forgot-password" onClick={clearLinkError}>ขอลิงก์ตั้งรหัสผ่านใหม่</Link><Link className="auth-back" to="/login" onClick={clearLinkError}>กลับไปเข้าสู่ระบบ</Link>
  </AuthCard>

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    if (password !== confirmation) { setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return }
    if (new TextEncoder().encode(password).length > 72) { setError('รหัสผ่านยาวเกินไป กรุณาใช้ไม่เกิน 72 ไบต์'); return }
    setBusy(true); setError(null)
    try {
      const result = await supabase.auth.updateUser({ password })
      if (result.error) throw result.error
      setPassword(''); setConfirmation('')
      await signOut()
      navigate('/login', { replace: true, state: { message: 'ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง' } })
    } catch (cause) { setError(authErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <AuthCard title="ตั้งรหัสผ่านใหม่" subtitle="ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษรและเก็บไว้สำหรับบัญชีนี้">
    {error && <Feedback>{error}</Feedback>}
    <form className="auth-form" onSubmit={submit} aria-busy={busy}>
      <PasswordField label="รหัสผ่านใหม่" value={password} onChange={setPassword} newPassword disabled={busy} />
      <PasswordField label="ยืนยันรหัสผ่านใหม่" value={confirmation} onChange={setConfirmation} newPassword disabled={busy} />
      <button className="auth-primary" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}</button>
    </form>
  </AuthCard>
}
