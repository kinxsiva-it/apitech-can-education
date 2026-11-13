import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { MemberAccess } from '@apitech/contracts'
import { AUTH_STORAGE_KEY, initialAuthLink, supabase } from '../../lib/supabase/client'
import { AuthContext } from './auth-context'
import { apiErrorMessage, getMemberAccess } from './membership-api'

interface AccessResult { token: string; access: MemberAccess | null; error: string | null; loading: boolean }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(!supabase)
  const [result, setResult] = useState<AccessResult | null>(null)
  const [revision, setRevision] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [recovery, setRecovery] = useState(initialAuthLink.recovery)
  const [linkError, setLinkError] = useState(initialAuthLink.error)
  const token = session?.access_token
  const userId = session?.user.id

  useEffect(() => {
    if (!supabase) return
    let active = true
    let eventSeen = false
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return
      eventSeen = true
      setSession(next)
      setInitialized(true)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') { setRecovery(false); setResult(null) }
    })
    supabase.auth.getSession().then(({ data: current, error }) => {
      if (!active || eventSeen) return
      setSession(error ? null : current.session)
      if (error) setNotice('ไม่สามารถคืนค่าเซสชันได้ กรุณาเข้าสู่ระบบใหม่')
      setInitialized(true)
    }).catch(() => {
      if (active && !eventSeen) { setInitialized(true); setNotice('ติดต่อระบบเข้าสู่ระบบไม่ได้ กรุณาลองใหม่') }
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  const refreshAccess = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    if (!token || !userId) return
    const controller = new AbortController()
    let active = true
    // Synchronize the loading state with this external request, preserving the mounted lesson during refresh.
    // oxlint-disable-next-line react/set-state-in-effect
    setResult((previous) => ({ token, access: previous?.token === token ? previous.access : null, error: null, loading: true }))
    getMemberAccess(token, controller.signal).then((access) => {
      if (access.user_id !== userId) throw new Error('Identity mismatch')
      if (active) setResult({ token, access, error: null, loading: false })
    }).catch((error: unknown) => {
      if (active) setResult({ token, access: null, error: apiErrorMessage(error), loading: false })
    })
    return () => { active = false; controller.abort() }
  }, [token, userId, revision])

  useEffect(() => {
    if (!token) return
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refreshAccess() }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    const timer = setInterval(refreshWhenVisible, 30000)
    return () => { window.removeEventListener('focus', refreshWhenVisible); document.removeEventListener('visibilitychange', refreshWhenVisible); clearInterval(timer) }
  }, [token, refreshAccess])

  const signOut = useCallback(async () => {
    // Hide protected UI immediately, even if the Auth server is unreachable.
    setSession(null); setResult(null); setRecovery(false); setLinkError(null)
    try {
      const response = await supabase?.auth.signOut({ scope: 'local' })
      setNotice(response?.error ? 'ออกจากระบบในเครื่องนี้แล้ว กรุณาตรวจการเชื่อมต่อก่อนเข้าสู่ระบบอีกครั้ง' : null)
    } catch { setNotice('ออกจากระบบในเครื่องนี้แล้ว กรุณาตรวจการเชื่อมต่อ') }
    finally {
      try { localStorage.removeItem(AUTH_STORAGE_KEY); localStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`) } catch { /* Persistence may be unavailable. */ }
    }
  }, [])

  // Do not reuse another session's access while the new request is still starting.
  const current = token && result?.token === token ? result : null
  return <AuthContext.Provider value={{ initialized, configured: Boolean(supabase), session,
    access: current?.access ?? null, accessLoading: Boolean(token) && (!current || current.loading), accessError: current?.error ?? null,
    notice, recovery, linkError, signOut, refreshAccess, clearLinkError: () => setLinkError(null) }}>{children}</AuthContext.Provider>
}
