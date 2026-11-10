import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../dist/app.js'
import { validateEnvironment } from '../dist/config/environment.js'

test('API health and CORS through a real HTTP listener', async () => {
  const app = await createApp(false)
  try {
    await app.listen(0, '127.0.0.1')
    const url = await app.getUrl()
    const response = await fetch(`${url}/api/health`, { headers: { Origin: 'http://localhost:5174' } })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { status: 'ok', service: 'apitech-api' })
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5174')
    const untrusted = await fetch(`${url}/api/health`, { headers: { Origin: 'https://untrusted.example' } })
    assert.equal(untrusted.headers.get('access-control-allow-origin'), null)
    assert.equal((await fetch(`${url}/api/members`)).status, 404)
  } finally {
    await app.close()
  }
})

test('startup rejects invalid port and wildcard CORS configuration', () => {
  assert.throws(() => validateEnvironment({ PORT: 'invalid' }), /PORT/)
  assert.throws(() => validateEnvironment({ CORS_ORIGINS: '*' }), /CORS_ORIGINS/)
})
