import { readFile, writeFile, access } from 'node:fs/promises'
import { parseEnv } from 'node:util'

const dir = new URL('./', import.meta.url)
const api = '{{api_base_url}}'
const authUrl = '{{supabase_url}}/auth/v1'
const noauth = { type: 'noauth' }
const bearer = (variable) => ({ type: 'bearer', bearer: [{ key: 'token', value: `{{${variable}}}`, type: 'string' }] })
const event = (listen, code) => ({ listen, script: { type: 'text/javascript', exec: code.trim().split('\n') } })
const requireValues = (...keys) => keys.map((key) => `if (!pm.environment.get(${JSON.stringify(key)})) throw new Error('Fill environment variable: ${key}');`).join('\n')
const clear = (...keys) => keys.map((key) => `pm.environment.unset(${JSON.stringify(key)});`).join('\n')
const jsonBody = (expression) => `pm.variables.set('request_json', JSON.stringify(${expression}));`
const ok = (status = 200) => `pm.test('HTTP ${status}', function () { pm.expect(pm.response.code).to.eql(${status}); });`
const positive = (key) => `if (!Number.isInteger(Number(pm.environment.get('${key}'))) || Number(pm.environment.get('${key}')) < 1) throw new Error('Load the current ${key} first');`
const targetFields = ['target_user_id', 'target_access_version', 'target_request_id', 'target_request_version', 'target_request_status', 'target_status']

function request(name, method, url, { description = '', auth = noauth, headers = [], pre = '', post = ok(), body } = {}) {
  const events = []
  const configCheck = url.startsWith(api) ? requireValues('api_base_url') : requireValues('supabase_url', 'supabase_publishable_key')
  const guardedPre = `${configCheck}\n${pre}`.replaceAll('throw new Error(', 'stopRequest(')
  events.push(event('prerequest', `function stopRequest(message) { pm.execution.skipRequest(); throw new Error(message); }\n${guardedPre}`))
  if (post) events.push(event('test', post))
  return { name, event: events, request: { method, url, description, auth,
    header: [...headers, ...(body ? [{ key: 'Content-Type', value: 'application/json' }] : [])],
    ...(body ? { body: { mode: 'raw', raw: '{{request_json}}', options: { raw: { language: 'json' } } } } : {}),
  } }
}
const apiKey = [{ key: 'apikey', value: '{{supabase_publishable_key}}' }]

function tokenResponse(prefix) {
  return `${ok()}
let data = {}; try { data = pm.response.json(); } catch (_) {}
if (pm.response.code === 200 && typeof data.access_token === 'string' && data.user && data.user.id) {
  pm.environment.set('${prefix}_access_token', data.access_token);
  pm.environment.set('${prefix}_refresh_token', data.refresh_token || '');
  pm.environment.set('${prefix}_user_id', data.user.id);
  ${prefix === 'member' ? "pm.environment.set('target_user_id', data.user.id);" : ''}
} else {
  ${clear(`${prefix}_access_token`, `${prefix}_refresh_token`, `${prefix}_user_id`)}
}`
}
function login(prefix, name) {
  return request(name, 'POST', `${authUrl}/token?grant_type=password`, {
    description: 'Calls Supabase Auth directly. Enter credentials in the selected environment. It does not change passwords. Failed login clears stale tokens.',
    headers: apiKey, body: true,
    pre: `${requireValues('supabase_url', 'supabase_publishable_key', `${prefix}_email`, `${prefix}_password`)}
${clear(`${prefix}_access_token`, `${prefix}_refresh_token`, `${prefix}_user_id`, ...(prefix === 'member' ? [...targetFields, 'member_profile_revision', 'member_access_version', 'member_request_id', 'member_request_version'] : []))}
${jsonBody(`{ email: pm.environment.get('${prefix}_email').trim(), password: pm.environment.get('${prefix}_password') }`)}`,
    post: tokenResponse(prefix),
  })
}
function refresh(prefix) {
  return request(`Refresh ${prefix} session (optional)`, 'POST', `${authUrl}/token?grant_type=refresh_token`, {
    headers: apiKey, body: true, description: 'Rotates the refresh token. Do not repeatedly reuse a previously exported token.',
    pre: `${requireValues('supabase_publishable_key', `${prefix}_refresh_token`)}
${jsonBody(`{ refresh_token: pm.environment.get('${prefix}_refresh_token') }`)}
${clear(`${prefix}_access_token`, `${prefix}_refresh_token`)}`,
    post: tokenResponse(prefix),
  })
}
const memberAuth = bearer('member_access_token')
const adminAuth = bearer('admin_access_token')
const memberRequired = requireValues('member_access_token')
const adminRequired = requireValues('admin_access_token')
const targetRequired = `${adminRequired}\n${requireValues('target_user_id')}`

const selectTarget = `${ok()}
if (pm.response.code === 200) {
  const page = pm.response.json();
  const target = pm.environment.get('target_user_id');
  const row = page.items.find(function (item) { return item.user_id === target; });
  ${clear('target_access_version', 'target_request_id', 'target_request_version', 'target_request_status', 'target_status')}
  // Never silently choose the first member in a list.
  if (row) {
    pm.environment.set('target_access_version', row.access_version);
    pm.environment.set('target_status', row.status);
    if (row.latest_request) {
      pm.environment.set('target_request_id', row.latest_request.id);
      pm.environment.set('target_request_version', row.latest_request.version);
      pm.environment.set('target_request_status', row.latest_request.status);
    }
  }
}`

function review(decision) {
  return request(`${decision === 'approved' ? 'Approve' : 'Reject'} selected request — CHANGES DATA`, 'PATCH', `${api}/admin/membership-requests/{{target_request_id}}`, {
    auth: adminAuth, body: true,
    description: 'Uses the explicitly selected target and its current version. This changes the hosted account and queues an email event. Get the member list again before another action.',
    pre: `${targetRequired}\n${requireValues('target_request_id')}\n${positive('target_request_version')}
if (pm.environment.get('target_request_status') !== 'pending') throw new Error('Load a pending request for the selected target first');
${decision === 'rejected' ? requireValues('rejection_reason') + "\nif (!pm.environment.get('rejection_reason').trim()) throw new Error('Rejection reason is required');" : ''}
${jsonBody(`{ decision: '${decision}', reason: ${decision === 'rejected' ? "pm.environment.get('rejection_reason').trim()" : 'null'}, expectedVersion: Number(pm.environment.get('target_request_version')) }`)}`,
    post: `${ok()}
if (pm.response.code === 200) {
 const row = pm.response.json();
 pm.environment.set('target_request_version', row.version);
 pm.environment.set('target_request_status', row.status);
 pm.environment.set('target_status', row.status);
 pm.environment.unset('target_access_version');
}`,
  })
}
function changeStatus(action) {
  return request(`${action === 'suspend' ? 'Suspend' : 'Restore'} selected instructor — CHANGES DATA`, 'PATCH', `${api}/admin/members/{{target_user_id}}/status`, {
    auth: adminAuth, body: true,
    description: 'Only changes an instructor account. Requires fresh access version and matching current state.',
    pre: `${targetRequired}\n${positive('target_access_version')}
if (pm.environment.get('target_status') !== '${action === 'suspend' ? 'approved' : 'suspended'}') throw new Error('Refresh the target from the member list; wrong current state');
${action === 'suspend' ? requireValues('suspension_reason') + "\nif (!pm.environment.get('suspension_reason').trim()) throw new Error('Suspension reason is required');" : ''}
${jsonBody(`{ action: '${action}', reason: ${action === 'suspend' ? "pm.environment.get('suspension_reason').trim()" : 'null'}, expectedVersion: Number(pm.environment.get('target_access_version')) }`)}`,
    post: `${ok()}
if (pm.response.code === 200) {
 const row = pm.response.json();
 pm.environment.set('target_access_version', row.version);
 pm.environment.set('target_status', row.status);
}`,
  })
}

const collection = {
  info: { _postman_id: 'da7e5150-bcde-4cba-9c30-d6dc90fdb103', name: 'APITech — Membership API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Manual testing of Supabase Auth and the local NestJS API. Select an environment. Use Send one request at a time; do not run the entire collection because Admin actions change hosted data. No Admin account is created by this collection.' },
  auth: noauth,
  item: [
    { name: '00 — Public checks', item: [
      request('Health — START HERE', 'GET', `${api}/health`),
      request('Active institution options', 'GET', `${api}/institutions?limit=20`),
    ] },
    { name: '01 — Member authentication', item: [
      login('member', 'Login member — use your existing confirmed account'),
      request('Signup — OPTIONAL, new account only, sends email', 'POST', `${authUrl}/signup?redirect_to=http%3A%2F%2Flocalhost%3A5173`, {
        headers: apiKey, body: true,
        description: 'Skip this for an existing confirmed account. Use an email allowed by your SMTP provider. The response does not guarantee a new account or reset an existing password.',
        pre: `${requireValues('supabase_url', 'supabase_publishable_key', 'member_email', 'member_password', 'full_name')}
${jsonBody("{ email: pm.environment.get('member_email').trim(), password: pm.environment.get('member_password'), data: {full_name: pm.environment.get('full_name').trim()} }")}`,
      }),
      refresh('member'),
    ] },
    { name: '02 — My membership', item: [
      request('My status — run after Login', 'GET', `${api}/members/me`, { auth: memberAuth, pre: memberRequired,
        post: `${ok()}
if (pm.response.code === 200) {
 const row = pm.response.json();
 pm.environment.set('member_access_version', row.version);
 if (row.latest_request) {
  pm.environment.set('member_request_id', row.latest_request.id);
  pm.environment.set('member_request_version', row.latest_request.version);
 }
}` }),
      request('My profile — saves profile revision', 'GET', `${api}/members/me/profile`, { auth: memberAuth, pre: memberRequired,
        post: `${ok()}\nif (pm.response.code === 200) pm.environment.set('member_profile_revision', pm.response.json().revision);` }),
      request('My request history', 'GET', `${api}/members/me/requests?limit=20&offset=0`, { auth: memberAuth, pre: memberRequired }),
      request('Update my profile — CHANGES DATA', 'PATCH', `${api}/members/me/profile`, { auth: memberAuth, body: true,
        description: 'Requires My profile first. A pending request freezes profile fields; expect 409 while under review. This example uses no institution selection.',
        pre: `${memberRequired}\n${requireValues('full_name')}\n${positive('member_profile_revision')}
${jsonBody("{fullName: pm.environment.get('full_name').trim(), institutionId: null, institutionOther: null, expectedRevision: Number(pm.environment.get('member_profile_revision'))}")}`,
        post: `${ok()}\nif (pm.response.code === 200) pm.environment.set('member_profile_revision', pm.response.json().revision);` }),
      request('Submit/resubmit my request — CHANGES DATA', 'POST', `${api}/members/me/requests`, { auth: memberAuth, body: true,
        description: 'Signup confirmation already queues complete profiles. Use for incomplete profiles or after rejection and correction.',
        pre: `${memberRequired}\n${positive('member_profile_revision')}
${jsonBody("{expectedRevision: Number(pm.environment.get('member_profile_revision'))}")}` }),
    ] },
    { name: '03 — Admin authentication (Dev-provisioned account)', item: [
      login('admin', 'Login Admin — requires a separate Admin account'), refresh('admin'),
      request('My Admin identity', 'GET', `${api}/members/me`, { auth: adminAuth, pre: adminRequired,
        post: `${ok()}\nif (pm.response.code === 200) pm.test('Active Admin', function () { const row = pm.response.json(); pm.expect(row.role).to.eql('admin'); pm.expect(row.can_access_education).to.eql(true); });` }),
    ] },
    { name: '04 — Admin member management', item: [
      request('Pending queue — selects only target_user_id', 'GET', `${api}/admin/members?status=pending&limit=100&offset=0`, {
        auth: adminAuth, pre: adminRequired, post: selectTarget,
        description: 'target_user_id is set to your test member on member Login. No arbitrary first-row auto-selection. If the target is absent, mutation versions are cleared.' }),
      request('All members — REFRESH BEFORE STATUS CHANGE', 'GET', `${api}/admin/members?limit=100&offset=0`, {
        auth: adminAuth, pre: adminRequired, post: selectTarget }),
      review('approved'), review('rejected'), changeStatus('suspend'), changeStatus('restore'),
    ] },
    { name: '05 — Read-only permission checks', item: [
      request('No token cannot read membership — expect 401', 'GET', `${api}/members/me`, { post: ok(401) }),
      request('Instructor cannot read Admin list — expect 403', 'GET', `${api}/admin/members`, { auth: memberAuth, pre: memberRequired, post: ok(403) }),
    ] },
  ],
}

const secretKeys = new Set(['member_password', 'admin_password', 'member_access_token', 'member_refresh_token', 'admin_access_token', 'admin_refresh_token'])
const defaults = {
  api_base_url: 'http://127.0.0.1:3000/api', supabase_url: 'https://zkhrylfgslbcgcwhdmpt.supabase.co', supabase_publishable_key: '',
  member_email: '', member_password: '', full_name: '', admin_email: '', admin_password: '',
  member_access_token: '', member_refresh_token: '', admin_access_token: '', admin_refresh_token: '',
  member_user_id: '', admin_user_id: '', member_profile_revision: '', member_access_version: '', member_request_id: '', member_request_version: '',
  target_user_id: '', target_access_version: '', target_request_id: '', target_request_version: '', target_request_status: '', target_status: '',
  rejection_reason: '', suspension_reason: '',
}
const environment = (values, name) => ({
  id: '6fd37958-c0c2-43ce-b329-d24a948bf0d4', name, _postman_variable_scope: 'environment',
  values: Object.entries(values).map(([key, value]) => ({ key, value, enabled: true, type: secretKeys.has(key) ? 'secret' : 'default' })),
})
const save = (file, value) => writeFile(new URL(file, dir), JSON.stringify(value, null, 2) + '\n')
await save('APITech.postman_collection.json', collection)
await save('APITech.postman_environment.example.json', environment(defaults, 'APITech Local — fill variables'))
if (process.argv.includes('--local')) {
  const local = new URL('APITech.local.postman_environment.json', dir)
  let exists = true
  try { await access(local) } catch { exists = false }
  if (!exists) {
    const config = parseEnv(await readFile(new URL('../../apps/api/.env.local', dir), 'utf8'))
    if (!config.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) throw new Error('A publishable key is required; never use a secret key.')
    await save('APITech.local.postman_environment.json', environment({ ...defaults,
      supabase_url: config.SUPABASE_URL, supabase_publishable_key: config.SUPABASE_PUBLISHABLE_KEY }, 'APITech Local'))
  }
  console.log('Local environment ready; existing local values preserved. Passwords are not imported.')
}
console.log('Postman collection and example environment generated.')
