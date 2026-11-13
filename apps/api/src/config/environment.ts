export function validateEnvironment(input: Record<string, unknown>) {
  const port = Number(input.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.')
  }
  const origins = String(input.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174')
    .split(',').map((origin) => origin.trim()).filter(Boolean)
  if (!origins.length || origins.some((origin) => {
    try {
      const url = new URL(origin)
      return !['http:', 'https:'].includes(url.protocol) || url.origin !== origin
    } catch { return true }
  })) throw new Error('CORS_ORIGINS must contain comma-separated HTTP(S) origins without trailing slashes.')
  const host = String(input.HOST ?? '127.0.0.1').trim()
  if (!host) throw new Error('HOST must not be empty.')
  const supabaseUrl = String(input.SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  const supabaseKey = String(input.SUPABASE_PUBLISHABLE_KEY ?? '').trim()
  if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) throw new Error('Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.')
  if (supabaseUrl) {
    let valid = false
    try {
      const url = new URL(supabaseUrl)
      valid = url.origin === supabaseUrl && (url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
    } catch { /* rejected below */ }
    if (!valid) throw new Error('SUPABASE_URL must be an HTTPS origin (HTTP allowed only for local development).')
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(supabaseKey)) throw new Error('Use a Supabase publishable key, never a secret/service-role key.')
  }
  return { ...input, PORT: port, HOST: host, CORS_ORIGINS: origins,
    SUPABASE_URL: supabaseUrl || undefined, SUPABASE_PUBLISHABLE_KEY: supabaseKey || undefined }
}
