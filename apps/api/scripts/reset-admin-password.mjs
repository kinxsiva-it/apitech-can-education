import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { createClient } from '@supabase/supabase-js'
import { readAdminKey } from './dev-admin-key.mjs'

class DevError extends Error {}

await run().catch((error) => {
  console.error(error instanceof DevError ? error.message : 'Dev reset failed. Check CLI login/network access. No password or Admin key was logged.')
  process.exitCode = 1
})

async function run() {
  const config = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'))
  const url = new URL(config.SUPABASE_URL)
  const targetId = config.DEV_ADMIN_USER_ID
  const targetEmail = config.DEV_ADMIN_EMAIL
  const match = /^([a-z]{20})\.supabase\.co$/.exec(url.hostname)
  if (url.protocol !== 'https:' || !match || !/^[0-9a-f-]{36}$/i.test(targetId ?? '') || !targetEmail) {
    throw new DevError('Fill SUPABASE_URL, DEV_ADMIN_USER_ID and DEV_ADMIN_EMAIL in apps/api/.env.local.')
  }
  console.log(`Project: ${url.hostname}\nAdmin account: ${targetEmail}`)
  if (process.argv.includes('--check')) { console.log('Configuration OK. No keys fetched and no password changed.'); return }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new DevError('Run in your own interactive terminal. Password arguments and piped input are not accepted.')

  // The command contains a validated project ref only; passwords never enter shell arguments.
  const command = `npx --yes --package=supabase@3.1.0 supabase projects api-keys --remote=${match[1]} --reveal --output-format json`
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const execution = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', command], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 })
    : spawnSync('npx', ['--yes', '--package=supabase@3.1.0', 'supabase', 'projects', 'api-keys', `--remote=${match[1]}`, '--reveal', '--output-format', 'json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 })
  if (execution.status !== 0) throw new DevError('CLI authorization unavailable. Run npx supabase login as the Project owner and retry.')
  let adminKey
  try { adminKey = readAdminKey(execution.stdout) } catch { throw new DevError('CLI did not return a usable Admin key. No key values were printed.') }
  execution.stdout = ''
  execution.stderr = ''
  const client = createClient(url.origin, adminKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } })
  adminKey = undefined

  const user = await client.auth.admin.getUserById(targetId)
  const access = await client.from('member_access').select('role,status').eq('user_id', targetId).single()
  if (user.error || access.error || user.data.user?.email?.toLowerCase() !== targetEmail.toLowerCase()
    || !user.data.user.email_confirmed_at || access.data.role !== 'admin' || access.data.status !== 'approved') {
    throw new DevError('The configured account is not a confirmed, approved Admin. Nothing changed.')
  }

  let hidden = false
  const output = new Writable({ write(chunk, encoding, done) { if (!hidden) process.stdout.write(chunk, encoding); done() } })
  const rl = createInterface({ input: process.stdin, output, terminal: true })
  rl.on('SIGINT', () => { rl.close(); process.exit(130) })
  const secret = async (label) => {
    process.stdout.write(label); hidden = true
    try { return await rl.question('') } finally { hidden = false; process.stdout.write('\n') }
  }
  let password
  try {
    password = await secret('New Admin password (hidden, at least 8 characters): ')
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) throw new DevError('Use at least 8 characters and at most 72 UTF-8 bytes.')
    if (password !== await secret('Confirm new password (hidden): ')) throw new DevError('Passwords do not match. Nothing changed.')
    const { error } = await client.auth.admin.updateUserById(targetId, { password })
    password = undefined
    if (error) throw new DevError('Auth rejected the password update. Check password policy and retry; no password was logged.')
    console.log('Admin password updated. Role and approval status are unchanged. Log in again in Postman with this password.')
    const audit = await client.from('audit_logs').insert({ actor_kind: 'system', action: 'admin.password_reset_by_dev',
      entity_type: 'auth_user', entity_id: targetId, after_data: { method: 'Supabase Auth Admin API', password_recorded: false } })
    if (audit.error) console.warn('Password update succeeded, but the application audit entry failed. Check Supabase Auth audit logs before retrying any reset.')
  } finally { password = undefined; rl.close() }
}
