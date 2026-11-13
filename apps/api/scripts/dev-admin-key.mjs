/** Only used by local Dev tooling. Never import this into an API or frontend. */
export function readAdminKey(output) {
  const result = JSON.parse(output)
  const modern = result.keys?.find((key) => key.type === 'secret'
    && typeof key.api_key === 'string' && /^sb_secret_[A-Za-z0-9_-]{20,}$/.test(key.api_key))
  if (modern) return modern.api_key
  const legacy = result.keys?.find((key) => key.name === 'service_role' && key.type === 'legacy')
  if (typeof legacy?.api_key === 'string') {
    const parts = legacy.api_key.split('.')
    if (parts.length === 3 && JSON.parse(Buffer.from(parts[1], 'base64url').toString()).role === 'service_role') return legacy.api_key
  }
  throw new Error('No usable Admin key returned by the authenticated CLI.')
}
