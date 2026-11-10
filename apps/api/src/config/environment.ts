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
  return { ...input, PORT: port, HOST: host, CORS_ORIGINS: origins }
}
