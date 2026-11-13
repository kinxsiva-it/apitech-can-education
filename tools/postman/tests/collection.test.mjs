import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Script, createContext } from 'node:vm'

const collection = JSON.parse(await readFile(new URL('../APITech.postman_collection.json', import.meta.url), 'utf8'))
const environment = JSON.parse(await readFile(new URL('../APITech.postman_environment.example.json', import.meta.url), 'utf8'))
const flatten = (items) => items.flatMap((item) => item.item ? flatten(item.item) : [item])
const requests = flatten(collection.item)
const find = (name) => requests.find((item) => item.name === name)

function sandbox(values = {}, body = {}, code = 200) {
  const env = new Map(environment.values.map((row) => [row.key, row.value]))
  Object.entries(values).forEach(([key, value]) => env.set(key, value))
  const local = new Map()
  const failures = []
  let skipped = false
  const context = createContext({ pm: {
    environment: { get: (key) => env.get(key), set: (key, value) => env.set(key, value), unset: (key) => env.delete(key) },
    variables: { set: (key, value) => local.set(key, value) },
    response: { code, json: () => body },
    expect: (value) => ({ to: { eql: (expected) => assert.deepEqual(value, expected) } }),
    test: (_name, fn) => { try { fn() } catch (error) { failures.push(error) } },
    execution: { skipRequest: () => { skipped = true } },
  } })
  return { env, local, failures, get skipped() { return skipped }, run(item, phase) {
    const event = item.event.find((entry) => entry.listen === phase)
    if (event) new Script(event.script.exec.join('\n')).runInContext(context)
  } }
}

test('import artifacts are structurally complete; examples contain no credentials and all scripts compile', () => {
  assert.ok(collection.info.schema.endsWith('/v2.1.0/collection.json'))
  assert.ok(requests.length > 15)
  for (const item of requests) {
    assert.ok(item.request.method && item.request.url)
    for (const event of item.event) new Script(event.script.exec.join('\n'))
  }
  for (const row of environment.values) {
    if (/password|token|email|publishable_key/.test(row.key)) assert.equal(row.value, '', row.key)
  }
})

test('login escapes passwords correctly and failed login clears stale session/target state', () => {
  const login = find('Login member — use your existing confirmed account')
  const values = { supabase_publishable_key: 'sb_publishable_test', member_email: 'a@example.test', member_password: 'quote"slash\\password',
    member_access_token: 'old', target_user_id: 'old-target', target_access_version: 10 }
  const s = sandbox(values, { error: 'invalid_credentials' }, 400)
  s.run(login, 'prerequest')
  assert.equal(JSON.parse(s.local.get('request_json')).password, values.member_password)
  s.run(login, 'test')
  assert.equal(s.failures.length, 1)
  assert.equal(s.env.get('member_access_token'), undefined)
  assert.equal(s.env.get('target_user_id'), undefined)
  assert.equal(s.env.get('target_access_version'), undefined)
})

test('member/Admin tokens remain separate and member login explicitly selects its own target', () => {
  const s = sandbox({ admin_access_token: 'admin-existing' }, { access_token: 'member-new', refresh_token: 'refresh-new', user: { id: 'test-member' } })
  s.run(find('Login member — use your existing confirmed account'), 'test')
  assert.equal(s.env.get('member_access_token'), 'member-new')
  assert.equal(s.env.get('admin_access_token'), 'admin-existing')
  assert.equal(s.env.get('target_user_id'), 'test-member')
  assert.equal(s.failures.length, 0)
})

test('queue never auto-selects the first user and missing target versions skip mutation requests', () => {
  const list = find('Pending queue — selects only target_user_id')
  const s = sandbox({ target_user_id: 'absent', target_access_version: 9, admin_access_token: 'admin-token' },
    { items: [{ user_id: 'someone-else', access_version: 7, status: 'pending', latest_request: { id: 'other', version: 4, status: 'pending' } }] })
  s.run(list, 'test')
  assert.equal(s.env.get('target_user_id'), 'absent')
  assert.equal(s.env.get('target_request_id'), undefined)
  assert.equal(s.env.get('target_access_version'), undefined)
  assert.throws(() => s.run(find('Approve selected request — CHANGES DATA'), 'prerequest'))
  assert.equal(s.skipped, true)
})

test('review and access versions are kept distinct; review invalidates stale access version', () => {
  const s = sandbox({ target_user_id: 'test-member', admin_access_token: 'admin-token' }, { items: [{ user_id: 'test-member', status: 'pending',
    access_version: 12, latest_request: { id: 'test-request', version: 3, status: 'pending' } }] })
  s.run(find('Pending queue — selects only target_user_id'), 'test')
  s.run(find('Approve selected request — CHANGES DATA'), 'prerequest')
  assert.equal(JSON.parse(s.local.get('request_json')).expectedVersion, 3)
  assert.equal(s.env.get('target_access_version'), 12)
  const reviewed = sandbox(Object.fromEntries(s.env), { status: 'approved', version: 4 })
  reviewed.run(find('Approve selected request — CHANGES DATA'), 'test')
  assert.equal(reviewed.env.get('target_request_version'), 4)
  assert.equal(reviewed.env.get('target_access_version'), undefined)
  assert.throws(() => reviewed.run(find('Suspend selected instructor — CHANGES DATA'), 'prerequest'))
  assert.equal(reviewed.skipped, true)
})
