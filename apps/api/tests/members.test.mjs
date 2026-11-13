import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'

// Real HTTP through NestJS and supabase-js, with a controlled Auth/PostgREST boundary.
// SQL/RLS run separately in test:db; this fixture is not Supabase signature verification.
const adminId = '00000000-0000-4000-8000-000000000001'
const userId = '00000000-0000-4000-8000-000000000002'
const requestId = '10000000-0000-4000-8000-000000000001'
const now = '2026-11-13T00:00:00.000Z'
let app, upstream, apiUrl
let state
const savedEnv = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY }

const memberAccess = (id, role, status) => ({
  user_id: id, role, status, version: 1, email_confirmed: true,
  can_access_education: status === 'approved', latest_request: null,
})
const snapshot = { full_name: 'Teacher', institution_id: null, institution_name: null, institution_other: null }
const profile = { user_id: userId, full_name: 'Teacher', institution_id: null, institution_other: null, revision: 1, created_at: now, updated_at: now }
const request = { id: requestId, user_id: userId, status: 'pending', round_no: 1, version: 1, reason: null,
  profile_snapshot: snapshot, submitted_at: now, reviewed_at: null, reviewed_by: null }

beforeEach(() => {
  state = {
    access: { 'admin-token': memberAccess(adminId, 'admin', 'approved'), 'user-token': memberAccess(userId, 'instructor', 'pending') },
    calls: [], failure: null, accessOverride: undefined, profile: { ...profile }, request: { ...request },
  }
})

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
  res.end(JSON.stringify(body))
}

before(async () => {
  upstream = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://fixture')
      const token = req.headers.authorization?.replace(/^Bearer /, '')
      const identity = state.access[token]
      let body = ''
      for await (const chunk of req) body += chunk
      const args = body ? JSON.parse(body) : {}
      state.calls.push({ path: url.pathname, query: url.searchParams, token, args, accept: req.headers.accept, apiKey: req.headers.apikey })
      if (url.pathname === '/auth/v1/user') {
        if (!identity) return send(res, 401, { msg: 'Invalid JWT', code: 'bad_jwt' })
        return send(res, 200, { id: identity.user_id, aud: 'authenticated', role: 'authenticated',
          email_confirmed_at: now, is_anonymous: false, user_metadata: { role: 'admin', status: 'approved' } })
      }
      if (url.pathname === '/rest/v1/institutions') return send(res, 200, [{ id: requestId, name: 'Teaching Institute' }])
      if (!identity) return send(res, 401, { code: 'PGRST301', message: 'Not authenticated' })
      if (state.failure?.path === url.pathname) return send(res, state.failure.status ?? 400, { code: state.failure.code, message: 'Sensitive SQL details must not be returned' })
      if (url.pathname === '/rest/v1/rpc/get_my_access') return send(res, 200, state.accessOverride === undefined ? identity : state.accessOverride)
      if (url.pathname === '/rest/v1/profiles') return send(res, 200, state.profile)
      if (url.pathname === '/rest/v1/membership_requests') return send(res, 200, [state.request], { 'Content-Range': '0-0/1' })
      if (url.pathname === '/rest/v1/rpc/update_my_profile') {
        state.profile = { ...state.profile, full_name: args.p_full_name, revision: state.profile.revision + 1 }
        return send(res, 200, state.profile)
      }
      if (url.pathname === '/rest/v1/rpc/submit_membership_request') return send(res, 200, requestId)
      if (url.pathname === '/rest/v1/rpc/list_members_for_admin') {
        return send(res, 200, { items: [{ user_id: userId, full_name: 'Teacher', email: 'teacher@example.test',
          email_confirmed: true, institution_name: null, status: 'pending', access_version: 1, profile_revision: 1,
          latest_request: { id: requestId, status: 'pending', round_no: 1, reason: null, version: 1, profile_snapshot: snapshot } }], total: 1, limit: args.p_limit, offset: args.p_offset })
      }
      if (url.pathname === '/rest/v1/rpc/review_membership_request') return send(res, 200, { ...state.request,
        status: args.p_decision, reason: args.p_reason, version: 2, reviewed_at: now, reviewed_by: adminId })
      if (url.pathname === '/rest/v1/rpc/change_member_status') return send(res, 200, { user_id: userId, role: 'instructor',
        status: args.p_action === 'suspend' ? 'suspended' : 'approved', version: 2, changed_at: now })
      send(res, 404, { message: 'Unexpected fixture route' })
    } catch {
      send(res, 500, { message: 'Fixture failure' })
    }
  })
  upstream.listen(0, '127.0.0.1')
  await once(upstream, 'listening')
  process.env.SUPABASE_URL = `http://127.0.0.1:${upstream.address().port}`
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_fixture'
  const { createApp } = await import('../dist/app.js')
  app = await createApp(false)
  await app.listen(0, '127.0.0.1')
  apiUrl = await app.getUrl()
})

after(async () => {
  if (app) await app.close()
  if (upstream) { upstream.closeAllConnections(); await new Promise((resolve) => upstream.close(resolve)) }
  if (savedEnv.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedEnv.url
  if (savedEnv.key === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = savedEnv.key
})

async function call(path, token, body, method = 'GET') {
  return fetch(`${apiUrl}/api${path}`, { method, headers: {
    ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
  }, body: body === undefined ? undefined : JSON.stringify(body) })
}

test('default-deny auth, malformed/expired tokens, public health and signup institutions', async () => {
  assert.equal((await call('/health')).status, 200)
  assert.equal((await call('/members/me')).status, 401)
  assert.equal((await call('/members/me', 'bad token')).status, 401)
  assert.equal((await call('/members/me', 'expired-token')).status, 401)
  const publicOptions = await call('/institutions?limit=10')
  assert.equal(publicOptions.status, 200)
  assert.equal((await publicOptions.json())[0].name, 'Teaching Institute')
  const upstreamCall = state.calls.find((c) => c.path === '/rest/v1/institutions')
  assert.equal(upstreamCall.query.get('select'), 'id,name')
  assert.equal(upstreamCall.token, 'sb_publishable_test_fixture')
  assert.equal((await call('/institutions?role=admin')).status, 400)
})

test('own status/profile/history preserve JWT, owner filters, pagination and no-store', async () => {
  const response = await call('/members/me', 'user-token')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal((await response.json()).role, 'instructor')
  assert.equal((await call('/members/me/profile', 'user-token')).status, 200)
  const history = await call('/members/me/requests?limit=5&offset=0', 'user-token')
  assert.equal(history.status, 200)
  assert.equal((await history.json()).total, 1)
  const selectCall = state.calls.find((c) => c.path === '/rest/v1/profiles')
  assert.equal(selectCall.query.get('user_id'), `eq.${userId}`)
  const scoped = state.calls.filter((c) => c.path.startsWith('/rest/') && c.path !== '/rest/v1/institutions')
  assert.ok(scoped.every((c) => c.token === 'user-token' && c.apiKey === 'sb_publishable_test_fixture'))
})

test('all Admin routes reject instructor even when Auth user_metadata claims admin', async () => {
  for (const [path, body, method] of [
    ['/admin/members', undefined, 'GET'],
    [`/admin/membership-requests/${requestId}`, { decision: 'approved', expectedVersion: 1 }, 'PATCH'],
    [`/admin/members/${userId}/status`, { action: 'suspend', reason: 'Review', expectedVersion: 1 }, 'PATCH'],
  ]) assert.equal((await call(path, 'user-token', body, method)).status, 403)
  assert.ok(!state.calls.some((c) => /list_members|review_membership|change_member/.test(c.path)))
  state.access['admin-token'] = { ...state.access['admin-token'], status: 'suspended', can_access_education: false }
  assert.equal((await call('/admin/members', 'admin-token')).status, 403)
})

test('strict validation blocks injected role/user/actor and invalid review/pagination before writes', async () => {
  const cases = [
    ['/members/me/profile', { fullName: 'Teacher', expectedRevision: 1, role: 'admin' }],
    ['/members/me/profile', { fullName: '  ', expectedRevision: 1 }],
    ['/members/me/profile', { fullName: 'Teacher', expectedRevision: 1, institutionId: 'not-uuid' }],
    ['/admin/membership-requests/not-uuid', { decision: 'approved', expectedVersion: 1 }],
    [`/admin/membership-requests/${requestId}`, { decision: 'rejected', expectedVersion: 1 }],
    [`/admin/members/${userId}/status`, { action: 'suspend', expectedVersion: 1 }],
    [`/admin/membership-requests/${requestId}`, { decision: 'approved', expectedVersion: 1, actorId: userId }],
  ]
  for (const [path, body] of cases) assert.equal((await call(path, 'admin-token', body, 'PATCH')).status, 400)
  assert.equal((await call('/members/me/requests', 'user-token', { expectedRevision: 1, userId: adminId }, 'POST')).status, 400)
  assert.equal((await call('/admin/members?limit=101', 'admin-token')).status, 400)
  assert.equal((await call('/admin/members?offset=-1', 'admin-token')).status, 400)
  assert.ok(state.calls.every((c) => !c.path.startsWith('/rest/v1/rpc/') || c.path.endsWith('get_my_access')))
})

test('valid profile/submit/admin review/status use named RPCs and single-row composite responses', async () => {
  assert.equal((await call('/members/me/profile', 'user-token', { fullName: ' Updated ', expectedRevision: 1 }, 'PATCH')).status, 200)
  const submit = await call('/members/me/requests', 'user-token', { expectedRevision: 2 }, 'POST')
  assert.equal(submit.status, 200); assert.deepEqual(await submit.json(), { request_id: requestId })
  const review = await call(`/admin/membership-requests/${requestId}`, 'admin-token', { decision: 'rejected', reason: 'Fix profile', expectedVersion: 1 }, 'PATCH')
  assert.equal(review.status, 200); assert.equal((await review.json()).reason, 'Fix profile')
  assert.equal((await call(`/admin/members/${userId}/status`, 'admin-token', { action: 'suspend', reason: 'Review', expectedVersion: 1 }, 'PATCH')).status, 200)
  const writes = state.calls.filter((c) => /update_my_profile|review_membership|change_member/.test(c.path))
  assert.ok(writes.every((c) => c.accept?.includes('application/vnd.pgrst.object+json')))
  assert.equal(writes.find((c) => c.path.endsWith('update_my_profile')).args.p_full_name, 'Updated')
  assert.equal(writes.find((c) => c.path.endsWith('review_membership_request')).token, 'admin-token')
})

test('Admin list passes bounded filters and current database state is reread for the same token', async () => {
  const result = await call('/admin/members?status=pending&search=Teacher&limit=10&offset=0', 'admin-token')
  assert.equal(result.status, 200)
  assert.equal((await result.json()).items[0].email, 'teacher@example.test')
  assert.deepEqual(state.calls.find((c) => c.path.endsWith('list_members_for_admin')).args, { p_status: 'pending', p_search: 'Teacher', p_limit: 10, p_offset: 0 })
  state.access['admin-token'].role = 'instructor'
  assert.equal((await call('/admin/members', 'admin-token')).status, 403)
})

test('database conflicts map to 409; outages/missing state fail closed without leaking SQL', async () => {
  state.failure = { path: '/rest/v1/rpc/submit_membership_request', code: '40001' }
  let response = await call('/members/me/requests', 'user-token', { expectedRevision: 1 }, 'POST')
  assert.equal(response.status, 409)
  assert.ok(!(await response.text()).includes('Sensitive SQL'))
  state.failure = { path: '/rest/v1/rpc/get_my_access', code: '42P01' }
  response = await call('/admin/members', 'admin-token')
  assert.equal(response.status, 503)
  assert.ok(!(await response.text()).includes('Sensitive SQL'))
  state.failure = null; state.accessOverride = null
  assert.equal((await call('/members/me', 'user-token')).status, 503)
  state.accessOverride = { ...state.access['user-token'], user_id: adminId }
  assert.equal((await call('/members/me', 'user-token')).status, 503)
})

test('RequireApproved rejects pending/suspended states with the same token', async () => {
  const { Reflector } = await import('@nestjs/core')
  const { AuthGuard } = await import('../dist/modules/auth/auth.guard.js')
  const { SupabaseGateway } = await import('../dist/modules/auth/supabase.gateway.js')
  const { APPROVED_ROUTE } = await import('../dist/modules/auth/auth.decorators.js')
  const handler = () => {}
  Reflect.defineMetadata(APPROVED_ROUTE,true,handler)
  const request = { headers: {authorization:'Bearer user-token'}, rawHeaders:['Authorization','Bearer user-token'] }
  const context = {getHandler:()=>handler,getClass:()=>class {},switchToHttp:()=>({getRequest:()=>request})}
  const guard = new AuthGuard(new Reflector(),app.get(SupabaseGateway))
  await assert.rejects(()=>guard.canActivate(context),(e)=>e.getStatus()===403)
  state.access['user-token'] = {...state.access['user-token'],status:'approved',can_access_education:true}
  assert.equal(await guard.canActivate(context),true)
  state.access['user-token'] = {...state.access['user-token'],status:'suspended',can_access_education:false}
  await assert.rejects(()=>guard.canActivate(context),(e)=>e.getStatus()===403)
})
