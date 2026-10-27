import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { Router } from 'express'
import { createApp } from '../../src/app.ts'
import { readEnvironment } from '../../src/config/env.ts'
import { startServer } from '../../src/server.ts'

test('a module can be mounted without database configuration or a listening side effect', async t => {
  const router = Router().get('/example', (_req, res) => res.json({ data: { name: 'example' } }))
  const app = createApp({ modules: [{ basePath: '/api', router }] })
  const server = app.listen(0, '127.0.0.1')
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())))
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const response = await fetch(`http://127.0.0.1:${address.port}/api/example`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { data: { name: 'example' } })
})

test('runtime shutdown stops HTTP and closes its database resource exactly once', async () => {
  let closed = 0
  const config = { ...readEnvironment({ DATABASE_URL: 'postgres://local:local@localhost/test' }), port: 0 }
  const runtime = await startServer({ config, closeDatabase: async () => { closed += 1 } })
  assert.ok(runtime.server.listening)
  await Promise.all([runtime.close(), runtime.close()])
  assert.equal(runtime.server.listening, false)
  assert.equal(closed, 1)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(`${signal} triggers graceful HTTP and database shutdown`, () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      import { startServer } from './src/server.ts';
      import { readEnvironment } from './src/config/env.ts';
      const config = { ...readEnvironment({ DATABASE_URL: 'postgres://local:local@localhost/test' }), port: 0 };
      await startServer({ config, closeDatabase: async () => console.log('DATABASE_CLOSED') });
      process.emit('${signal}');
    `], { encoding: 'utf8', timeout: 5000 })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /DATABASE_CLOSED/)
  })
}
