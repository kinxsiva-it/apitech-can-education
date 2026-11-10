import type { HealthResponse } from '@apitech/contracts'

const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiOrigin}/api/health`, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error('API unavailable')
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object' || !('status' in data) || !('service' in data)
    || data.status !== 'ok' || data.service !== 'apitech-api') {
    throw new Error('Invalid API response')
  }
  return { status: data.status, service: data.service }
}
