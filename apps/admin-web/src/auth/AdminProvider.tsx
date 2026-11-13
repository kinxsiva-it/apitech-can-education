import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { MemberAccess } from '@apitech/contracts'
import { ADMIN_AUTH_KEY, supabase } from '../lib/supabase'
import { api, errorMessage } from '../lib/http'
import { AdminContext } from './context'
export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(!supabase)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{
    token: string
    access: MemberAccess | null
    error: string | null
  } | null>(null)
  const token = session?.access_token,
    userId = session?.user.id
  useEffect(() => {
    if (!supabase) return
    let active = true,
      seen = false
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) {
        seen = true
        setSession(next)
        setInitialized(true)
      }
    })
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && !seen) {
          setSession(error ? null : data.session)
          setInitialized(true)
        }
      })
      .catch(() => {
        if (active && !seen) setInitialized(true)
      })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])
  const refresh = useCallback(() => setRevision((n) => n + 1), [])
  useEffect(() => {
    if (!token || !userId) return
    const controller = new AbortController()
    let active = true
    api<MemberAccess>(token, '/members/me', { signal: controller.signal })
      .then((access) => {
        if (
          access.user_id !== userId ||
          !['admin', 'instructor'].includes(access.role) ||
          typeof access.can_access_education !== 'boolean' ||
          access.can_access_education !==
            (access.status === 'approved' && access.email_confirmed === true)
        )
          throw new Error('Invalid access response')
        if (active) setResult({ token, access, error: null })
      })
      .catch((error) => {
        if (active)
          setResult({ token, access: null, error: errorMessage(error) })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [token, userId, revision])
  useEffect(() => {
    if (!token) return
    const tick = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const timer = setInterval(tick, 30000)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', tick)
    }
  }, [token, refresh])
  const logout = useCallback(async () => {
    setSession(null)
    setResult(null)
    try {
      await supabase?.auth.signOut({ scope: 'local' })
    } catch {
      /* Clear this application's local session even offline. */
    } finally {
      try {
        localStorage.removeItem(ADMIN_AUTH_KEY)
        localStorage.removeItem(`${ADMIN_AUTH_KEY}-code-verifier`)
      } catch {
        /* Storage disabled. */
      }
    }
  }, [])
  const current = token && result?.token === token ? result : null
  return (
    <AdminContext.Provider
      value={{
        initialized,
        session,
        access: current?.access ?? null,
        error: current?.error ?? null,
        checking: Boolean(token && !current),
        refresh,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}
