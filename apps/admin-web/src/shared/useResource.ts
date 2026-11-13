import { useCallback, useEffect, useState } from 'react'
import { useAdmin } from '../auth/context'
import { api, errorMessage } from '../lib/http'
export function useResource<T>(path: string) {
  const { session } = useAdmin()
  const token = session?.access_token ?? ''
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{
    key: string
    data?: T
    error?: string
  }>({ key: '' })
  const key = `${token}:${path}:${revision}`
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    let active = true
    api<T>(token, path, { signal: controller.signal })
      .then((data) => {
        if (active) setResult({ key, data })
      })
      .catch((error) => {
        if (active) setResult({ key, error: errorMessage(error) })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [key, path, token])
  const reload = useCallback(() => setRevision((n) => n + 1), [])
  return {
    data: result.key === key ? result.data : undefined,
    // Counts may retain the last response while refreshing this exact account/resource.
    previousData:
      token && result.key.startsWith(`${token}:${path}:`)
        ? result.data
        : undefined,
    error: result.key === key ? result.error : undefined,
    reload,
    token,
  }
}
