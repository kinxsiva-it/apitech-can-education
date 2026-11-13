import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { MemberProfile } from '@apitech/contracts'
import { useAuth } from '../auth-context'
import { apiErrorMessage, getMyProfile, submitRequest, updateMyProfile } from '../membership-api'
import { Feedback } from './AuthFrame'
import { InstitutionField } from './InstitutionField'

export function ProfileRequestForm() {
  const { session, refreshAccess } = useAuth()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [other, setOther] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const token = session?.access_token
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    let active = true
    // Clear the previous external profile while loading a new session or explicit retry.
    // oxlint-disable-next-line react/set-state-in-effect
    setProfile(null); setError(null)
    getMyProfile(token, controller.signal).then((row) => {
      if (!active) return
      setProfile(row); setName(row.full_name); setInstitution(row.institution_id ?? (row.institution_other ? 'other' : '')); setOther(row.institution_other ?? '')
    }).catch((cause: unknown) => { if (active) setError(apiErrorMessage(cause)) })
    return () => { active = false; controller.abort() }
  }, [token, retry])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!token || !profile || busy) return
    if (!name.trim() || (institution === 'other' && !other.trim())) { setError('กรุณากรอกข้อมูลให้ครบ'); return }
    setBusy(true); setError(null)
    try {
      const updated = await updateMyProfile(token, { fullName: name.trim(), institutionId: institution && institution !== 'other' ? institution : null,
        institutionOther: institution === 'other' ? other.trim() : null, expectedRevision: profile.revision })
      setProfile(updated)
      await submitRequest(token, updated.revision)
      refreshAccess()
    } catch (cause) { setError(apiErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <div className="auth-profile-form">
    {error && <><Feedback>{error}</Feedback><button className="auth-text-button" onClick={() => setRetry((n) => n + 1)} disabled={busy}>โหลดข้อมูลล่าสุด</button></>}
    {!profile ? !error && <p role="status">กำลังโหลดข้อมูลสมาชิก…</p> : <form className="auth-form" onSubmit={submit} aria-busy={busy}>
      <div className="auth-field"><label htmlFor="profile-name">ชื่อ–นามสกุล</label>
        <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={200} required disabled={busy} /></div>
      <InstitutionField value={institution} onChange={setInstitution} other={other} onOtherChange={setOther} disabled={busy} />
      <button className="auth-primary" disabled={busy}>{busy ? 'กำลังส่งคำขอ…' : 'บันทึกข้อมูลและส่งคำขอพิจารณา'}</button>
    </form>}
  </div>
}
