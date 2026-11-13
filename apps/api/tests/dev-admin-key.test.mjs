import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readAdminKey } from '../scripts/dev-admin-key.mjs'

test('Dev reset only accepts a usable privileged key from CLI output, never a publishable/redacted key', () => {
  const secret = 'sb_secret_' + 'fixture'.repeat(4)
  assert.equal(readAdminKey(JSON.stringify({ keys: [{ type: 'secret', api_key: secret }] })), secret)
  assert.throws(() => readAdminKey(JSON.stringify({ keys: [{ type: 'publishable', api_key: 'sb_publishable_fixture' }] })))
  assert.throws(() => readAdminKey(JSON.stringify({ keys: [{ type: 'secret', api_key: 'sb_secret_redacted***' }] })))
  const jwt = (role) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`
  assert.equal(readAdminKey(JSON.stringify({ keys: [{ type: 'legacy', name: 'service_role', api_key: jwt('service_role') }] })), jwt('service_role'))
  assert.throws(() => readAdminKey(JSON.stringify({ keys: [{ type: 'legacy', name: 'service_role', api_key: jwt('anon') }] })))
})
