import { useState } from 'react'
import { useAuth } from '../auth-context'

export function SignOutButton() {
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  return <button className="auth-secondary" disabled={busy} onClick={() => { setBusy(true); void signOut().finally(() => setBusy(false)) }}>
    {busy ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}</button>
}
