import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { createClient } from '@supabase/supabase-js'

class SmokeError extends Error {}

const mode = process.argv[2]
if (process.argv.includes('--help')) {
  console.log('signup: prompt locally and send a confirmation email. status: sign in and check the local Members API. --check: validate configuration without network requests.')
} else {
  await run().catch((error) => {
    console.error(error instanceof SmokeError ? error.message : 'Test failed. Check the connection and API configuration. No credentials were saved.')
    process.exitCode = 1
  })
}

async function run() {
  if (!['signup', 'status'].includes(mode)) throw new SmokeError('Use signup or status.')
  const file = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'))
  const url = file.SUPABASE_URL
  const key = file.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key?.startsWith('sb_publishable_') || url.includes('YOUR_PROJECT') || key.includes('YOUR_KEY')) {
    throw new SmokeError('Fill in apps/api/.env.local with the project URL and publishable key.')
  }
  const host = new URL(url)
  if (host.protocol !== 'https:' || host.origin !== url.replace(/\/$/, '')) throw new SmokeError('A Supabase HTTPS project origin is required.')
  console.log(`Project: ${host.hostname}`)
  if (process.argv.includes('--check')) { console.log('Configuration OK; no request sent.'); return }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new SmokeError('Run this command in your own interactive terminal. Do not pass passwords as arguments.')

  let hidden = false
  const output = new Writable({ write(chunk, encoding, done) {
    if (!hidden) process.stdout.write(chunk, encoding)
    done()
  } })
  const rl = createInterface({ input: process.stdin, output, terminal: true })
  rl.on('SIGINT', () => { rl.close(); process.exit(130) })
  async function secret(label) {
    process.stdout.write(label)
    hidden = true
    try { return await rl.question('') } finally { hidden = false; process.stdout.write('\n') }
  }
  let password
  let client
  try {
    const name = mode === 'signup' ? (await rl.question('Full name: ')).trim() : ''
    if (mode === 'signup' && (!name || name.length > 200)) throw new SmokeError('Name must contain 1–200 characters.')
    const email = (await rl.question('Email (use your Supabase account email for default SMTP): ')).trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SmokeError('Enter a valid email address.')
    password = await secret('Password (hidden): ')
    if (mode === 'signup' && password.length < 8) throw new SmokeError('Use a password of at least 8 characters.')
    if (mode === 'signup' && password !== await secret('Confirm password (hidden): ')) throw new SmokeError('Passwords do not match.')
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } })
    if (mode === 'signup') {
      const settings = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) })
      if (!settings.ok) throw new SmokeError('Could not check Auth configuration.')
      if ((await settings.json()).mailer_autoconfirm !== false) throw new SmokeError('Enable Confirm email in Supabase before testing.')
      const { error } = await client.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: 'http://localhost:5173' } })
      if (error) failAuth(error)
      console.log('Signup request accepted. Check Inbox/Spam for the confirmation email. If already registered, use status instead.')
      console.log('After confirming, run: npm run test:auth:status (start npm run dev:all in another terminal first).')
    } else {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error) failAuth(error)
      if (!data.session) throw new SmokeError('No session returned.')
      console.log('Supabase sign-in succeeded. Checking the local Members API...')
      const response = await fetch('http://127.0.0.1:3000/api/members/me', {
        headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new SmokeError(`Members API returned ${response.status}. Check that the API is running and migrations are applied.`)
      const state = await response.json()
      console.log(JSON.stringify({ role: state.role, status: state.status, email_confirmed: state.email_confirmed,
        can_access_education: state.can_access_education, request_round: state.latest_request?.round_no ?? null }, null, 2))
    }
  } finally {
    password = undefined
    rl.close()
    if (client) await client.auth.signOut({ scope: 'local' }).catch(() => {})
  }
}

function failAuth(error) {
  const code = /^[a-z0-9_]+$/.test(error.code ?? '') ? error.code : 'auth_error'
  if (code === 'invalid_credentials') throw new SmokeError('Email or password was not accepted. Use the password set during this app\'s signup, not the Supabase Dashboard password. Check keyboard language/Caps Lock. Signing up again does not reset an existing password.')
  if (code === 'email_not_confirmed') throw new SmokeError('Confirm your email first, then run status again.')
  if (code === 'email_address_not_authorized') throw new SmokeError('Default SMTP only allows Supabase team email addresses. Use the email of your Supabase account.')
  throw new SmokeError(`Supabase Auth: ${code}. Check SMTP configuration, email rate limits or account details. No credentials were logged.`)
}
