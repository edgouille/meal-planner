import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer, type Socket } from 'node:net'
import pg from 'pg'
import request from 'supertest'
import { createApp } from '../../src/app.ts'
import { createHealthModule, healthContract, healthResponseSchema, readinessResponseSchema } from '../../src/modules/health/index.ts'
import { errorResponseSchema } from '../../src/shared/http/errors.ts'

const silent = () => {}

test('liveness succeeds without acquiring a database connection', async () => {
  let calls = 0
  const pool = { async connect(): Promise<never> { calls++; throw new Error('offline') } }
  const app = createApp({ modules: [createHealthModule({ pool, readinessTimeoutMs: 100 })], logger: silent })
  const response = await request(app).get('/health').expect(200)
  assert.ok(healthResponseSchema.safeParse(response.body).success)
  assert.equal(calls, 0)
})

test('readiness executes SELECT 1 through the injected pool and releases its client', async () => {
  const statements: string[] = []
  const releases: boolean[] = []
  const pool = { async connect() { return {
    async query(sql: string) { statements.push(sql) },
    release(destroy = false) { releases.push(destroy) },
  } } }
  const app = createApp({ modules: [createHealthModule({ pool, readinessTimeoutMs: 100 })], logger: silent })
  const response = await request(app).get('/ready').expect(200)
  assert.ok(readinessResponseSchema.safeParse(response.body).success)
  assert.deepEqual(statements, ['SELECT 1'])
  assert.deepEqual(releases, [false])
})

test('database exceptions return sanitized 503 and destroy the failed client', async () => {
  const releases: boolean[] = []
  const pool = { async connect() { return {
    async query() { throw new Error('password=secret SELECT private_table') },
    release(destroy = false) { releases.push(destroy) },
  } } }
  const app = createApp({ modules: [createHealthModule({ pool, readinessTimeoutMs: 100 })], logger: silent })
  const response = await request(app).get('/ready').expect(503)
  assert.equal(response.body.error.code, 'DATABASE_UNAVAILABLE')
  assert.ok(errorResponseSchema.safeParse(response.body).success)
  assert.doesNotMatch(JSON.stringify(response.body), /password|secret|SELECT|stack|private_table/)
  assert.deepEqual(releases, [true])
})

test('a stalled query meets the HTTP deadline and destroys its connection exactly once', async () => {
  const releases: boolean[] = []
  const pool = { async connect() { return {
    query: () => new Promise<never>(() => {}),
    release(destroy = false) { releases.push(destroy) },
  } } }
  const app = createApp({ modules: [createHealthModule({ pool, readinessTimeoutMs: 30 })], logger: silent })
  const started = performance.now()
  await request(app).get('/ready').expect(503)
  assert.ok(performance.now() - started < 1000)
  assert.deepEqual(releases, [true])
  await request(app).get('/health').expect(200)
})

test('a queued connection arriving after the deadline is released without querying', async () => {
  let acquire!: (client: { query(): Promise<void>; release(): void }) => void
  let released = false
  let queried = false
  const pool = { connect: () => new Promise<{ query(): Promise<void>; release(): void }>(resolve => { acquire = resolve }) }
  const app = createApp({ modules: [createHealthModule({ pool, readinessTimeoutMs: 20 })], logger: silent })
  await request(app).get('/ready').expect(503)
  acquire({ async query() { queried = true }, release() { released = true } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(released, true)
  assert.equal(queried, false)
})

test('real pg driver connection stalls time out without blocking liveness or leaking sockets', async () => {
  const sockets = new Set<Socket>()
  // Accept TCP but never answer PostgreSQL startup: a deterministic network failure.
  const blackhole = createServer(socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)) })
  await new Promise<void>(resolve => blackhole.listen(0, '127.0.0.1', resolve))
  const address = blackhole.address()
  assert.ok(address && typeof address === 'object')
  const pool = new pg.Pool({ host: '127.0.0.1', port: address.port, user: 'test', database: 'test', connectionTimeoutMillis: 100 })
  try {
    const app = createApp({ modules: [createHealthModule({ pool, readinessTimeoutMs: 50 })], logger: silent })
    const started = performance.now()
    await request(app).get('/ready').expect(503)
    assert.ok(performance.now() - started < 1000)
    await request(app).get('/health').expect(200)
  } finally {
    await pool.end()
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve, reject) => blackhole.close(error => error ? reject(error) : resolve()))
  }
})

test('public endpoint metadata references the same schemas without loading the runtime', () => {
  assert.deepEqual(healthContract.map(contract => [contract.method, contract.path]), [['get', '/health'], ['get', '/ready']])
  assert.equal(healthContract[0].responses[200].schema, healthResponseSchema)
  assert.equal(healthContract[1].responses[200].schema, readinessResponseSchema)
  assert.equal(healthContract[1].responses[503].schema, errorResponseSchema)
})

test('readiness uses a live PostgreSQL test database when TEST_DATABASE_URL is provided', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!)
  assert.match(url.pathname, /_test$/, 'Use a dedicated database whose name ends in _test.')
  const pool = new pg.Pool({ connectionString: url.toString(), connectionTimeoutMillis: 1000 })
  try {
    const app = createApp({ modules: [createHealthModule({ pool, readinessTimeoutMs: 2000 })], logger: silent })
    await request(app).get('/ready').expect(200)
    await request(app).get('/health').expect(200)
  } finally {
    await pool.end()
  }
})
