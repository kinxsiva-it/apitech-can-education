import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase/client'
import { useAuth } from '../auth-context'
import { authErrorMessage } from '../auth-links'
import { AuthCard, Feedback } from '../components/AuthFrame'

function EmailPage({ recovery }: { recovery: boolean }) {
  const location = useLocation()
  const { session } = useAuth()
  const initialEmail: unknown = location.state?.email
  const [email, setEmail] = useState(typeof initialEmail === 'string' ? initialEmail : session?.user.email ?? '')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true); setError(null); setSent(false)
    try {
      const result = recovery
        ? await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
        : await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      if (result.error) throw result.error
      setSent(true)
    } catch (authError) { setError(authErrorMessage(authError)) }
    finally { setBusy(false) }
  }
  return <AuthCard title={recovery ? 'ลืมรหัสผ่าน' : 'ยืนยันอีเมลของคุณ'}
    subtitle={recovery ? 'กรอกอีเมลของบัญชีเพื่อรับลิงก์ตั้งรหัสผ่านใหม่' : 'เปิดอีเมลที่ใช้สมัครและกดลิงก์ยืนยัน ตรวจโฟลเดอร์สแปมหากยังไม่พบ'}>
    {sent && <Feedback kind="success">หากบัญชีนี้สามารถรับอีเมลได้ ระบบจะส่งลิงก์ให้ กรุณาตรวจกล่องจดหมายและใช้ลิงก์ล่าสุด</Feedback>}
    {error && <Feedback>{error}</Feedback>}
    <form onSubmit={submit} className="auth-form" aria-busy={busy}>
      <div className="auth-field"><label htmlFor="recovery-email">อีเมล</label><input id="recovery-email" type="email" required autoComplete="email"
        value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></div>
      <button className="auth-primary" disabled={busy}>{busy ? 'กำลังส่ง…' : recovery ? 'ส่งลิงก์ตั้งรหัสผ่านใหม่' : 'ส่งอีเมลยืนยันอีกครั้ง'}</button>
    </form>
    <p className="auth-field-hint">ลิงก์ใช้ได้ครั้งเดียว หากเคยยืนยันอีเมลแล้วให้เข้าสู่ระบบได้เลย</p>
    <Link className="auth-back" to="/login">กลับไปเข้าสู่ระบบ</Link>
  </AuthCard>
}
export function VerifyEmailPage() { return <EmailPage recovery={false} /> }
export function ForgotPasswordPage() { return <EmailPage recovery /> }
