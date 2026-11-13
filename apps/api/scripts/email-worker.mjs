import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

export function message(job, siteUrl) {
  const approved = job.template === 'membership_approved'
  return {
    subject: approved
      ? 'APITech: อนุมัติบัญชีผู้สอนแล้ว'
      : 'APITech: ผลการพิจารณาคำขอใช้งาน',
    text: approved
      ? `บัญชี APITech Education ของคุณได้รับการอนุมัติแล้ว เข้าสู่ระบบได้ที่ ${siteUrl}/login`
      : `คำขอใช้งานของคุณยังไม่ผ่านการอนุมัติ\nเหตุผล: ${job.reason ?? '-'}\nคุณสามารถแก้ไขข้อมูลและส่งคำขอใหม่ได้ที่ ${siteUrl}/login`,
  }
}
export async function processOne(client, config, deliver = fetch) {
  const { data: job, error } = await client.rpc('claim_membership_email')
  if (error) throw new Error('Cannot claim email task')
  if (!job) return false
  if (job.skipped) return true
  let sent = false,
    providerId = null
  try {
    const response = await deliver('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `membership-${job.id}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: [job.recipient],
        ...message(job, config.siteUrl),
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (response.ok) {
      const data = await response.json()
      if (typeof data.id === 'string') {
        sent = true
        providerId = data.id
      }
    }
  } catch {
    /* Provider response details and recipient data are never logged. */
  }
  const result = await client.rpc('finish_membership_email', {
    p_id: job.id,
    p_claim: job.claim,
    p_sent: sent,
    p_provider_id: providerId,
  })
  if (result.error || result.data !== true)
    throw new Error('Cannot acknowledge email task')
  return true
}
async function main() {
  let file = {}
  try {
    file = parseEnv(
      await readFile(new URL('../.env.local', import.meta.url), 'utf8'),
    )
  } catch {
    /* Environment may be injected in production. */
  }
  const env = { ...file, ...process.env }
  // Pilot phase: membership decisions are communicated directly by the administrator.
  // An explicit server-side opt-in is required before claiming or sending any queued task.
  if (env.MEMBERSHIP_EMAIL_ENABLED !== 'true') {
    console.log('Membership result emails are disabled. No task claimed and no email sent.')
    return
  }
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_SECRET_KEY ||
    !env.RESEND_API_KEY ||
    !env.EMAIL_FROM ||
    !env.EDUCATION_SITE_URL
  )
    throw new Error('Configure worker environment first')
  const url = new URL(env.EDUCATION_SITE_URL)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.origin !== env.EDUCATION_SITE_URL
  )
    throw new Error('Use an Education origin without a trailing slash')
  if (process.argv.includes('--check')) {
    console.log('Email worker configuration present; no request sent.')
    return
  }
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, init) =>
        fetch(url, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  })
  let count = 0
  while (
    count < 10 &&
    (await processOne(client, {
      key: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
      siteUrl: url.origin,
    }))
  )
    count++
  console.log(
    `Email worker finished: ${count} task(s) processed. See CMS delivery status for results.`,
  )
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch(() => {
    console.error(
      'Email worker failed. Check server configuration and CMS delivery status. No credentials or recipients logged.',
    )
    process.exitCode = 1
  })
