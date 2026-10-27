import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readEnvironment } from './env.ts'

const base = { DATABASE_URL: 'postgres://test:test@localhost:5433/mealplanner_test' }

test('validates explicit configuration and supplies development defaults', () => {
  const config = readEnvironment(base)
  assert.equal(config.port, 3000)
  assert.equal(config.host, '127.0.0.1')
  assert.equal(config.frontendOrigin, 'http://localhost:5173')
  assert.equal(readEnvironment({ ...base, PORT: '4000' }).port, 4000)
})

test('rejects invalid configuration without exposing credentials', () => {
  for (const invalid of [
    { PORT: '0' }, { PORT: '65536' }, { PORT: '3.5' }, { PORT: '' },
    { NODE_ENV: 'unknown' }, { HOST: '' }, { SHUTDOWN_TIMEOUT_MS: '-1' },
    { FRONTEND_ORIGIN: 'http://localhost:5173/path' },
    { FRONTEND_ORIGIN: 'http://user:secret@localhost' },
    { DATABASE_URL: 'http://user:secret@localhost/test' },
    { DATABASE_URL: 'postgres://user:secret@localhost' },
  ]) {
    assert.throws(() => readEnvironment({ ...base, ...invalid }), error => {
      assert.ok(error instanceof Error)
      assert.doesNotMatch(error.message, /secret/)
      return true
    })
  }
  assert.throws(() => readEnvironment({}), /DATABASE_URL/)
})
