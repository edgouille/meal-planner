import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { SignJWT } from 'jose'
import pg from 'pg'
import request from 'supertest'
import { createApp } from '../../src/app.ts'
import { createAccessTokens, requireAuthentication } from '../../src/modules/auth/index.ts'
import { createUserRepository, createUsersModule, profileResponseSchema, type User } from '../../src/modules/users/index.ts'
import { errorResponseSchema } from '../../src/shared/http/errors.ts'

const secret = Buffer.alloc(32, 7)
const tokens = createAccessTokens(secret)
const silent = () => {}
const accountA = { id: '3f0c5a52-4f6d-4c55-9a43-6d2b1f5e8a01', email: 'camille@example.test', displayName: 'Camille' }
const accountB = { id: '7b1e9d34-2c8a-4e0f-b6d5-9a3c4e2f1b02', email: 'lois@example.test', displayName: 'Loïs' }

type Repository = Parameters<typeof createUsersModule>[0]

function memoryRepository(): Repository & { stored: Map<string, User> } {
  const stored = new Map<string, User>(
    [accountA, accountB].map(account => [account.id, { ...account, createdAt: new Date('2026-01-01T00:00:00Z') }]),
  )
  return {
    stored,
    async findById(id) {
      return stored.get(id) ?? null
    },
    async updateDisplayName(id, displayName) {
      const user = stored.get(id)
      if (!user) return null
      const updated = { ...user, displayName }
      stored.set(id, updated)
      return updated
    },
  }
}

function fixture(users: Repository = memoryRepository()) {
  const app = createApp({ modules: [createUsersModule(users, requireAuthentication(tokens))], logger: silent })
  return { api: request(app) }
}

const bearer = async (userId: string) => `Bearer ${await tokens.issue(userId)}`

test('reads the signed-in profile and exposes only email and displayName', async () => {
  const { api } = fixture()
  const response = await api.get('/api/users/me').set('Authorization', await bearer(accountA.id))
    .expect(200).expect('Cache-Control', 'no-store')
  assert.deepEqual(response.body, { data: { email: accountA.email, displayName: accountA.displayName } })
  assert.ok(profileResponseSchema.safeParse(response.body).success)
})

test('updates the display name after trimming it and returns the stored profile', async () => {
  const users = memoryRepository()
  const { api } = fixture(users)
  const authorization = await bearer(accountA.id)
  const response = await api.patch('/api/users/me').set('Authorization', authorization)
    .send({ displayName: '  Camille Martin  ' }).expect(200).expect('Cache-Control', 'no-store')
  assert.deepEqual(response.body, { data: { email: accountA.email, displayName: 'Camille Martin' } })
  assert.equal(users.stored.get(accountA.id)!.displayName, 'Camille Martin')
  await api.get('/api/users/me').set('Authorization', authorization)
    .expect(200, { data: { email: accountA.email, displayName: 'Camille Martin' } })

  const longest = 'x'.repeat(100)
  await api.patch('/api/users/me').set('Authorization', authorization).send({ displayName: ` ${longest} ` })
    .expect(200, { data: { email: accountA.email, displayName: longest } })
})

test('rejects invalid bodies with the shared validation format and leaves the profile unchanged', async () => {
  const users = memoryRepository()
  const { api } = fixture(users)
  const authorization = await bearer(accountA.id)
  const invalidBodies: unknown[] = [
    {},
    { displayName: '' },
    { displayName: '   ' },
    { displayName: 'x'.repeat(101) },
    { displayName: 42 },
    { displayName: null },
    { displayName: ['Camille'] },
    { displayName: 'Camille\0' },
    { displayName: 'Camille', email: 'other@example.test' },
    { displayName: 'Camille', userId: accountB.id },
    ['Camille'],
  ]
  for (const body of invalidBodies) {
    const response = await api.patch('/api/users/me').set('Authorization', authorization).send(body as object)
    assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(body)}`)
    assert.equal(response.body.error.code, 'VALIDATION_ERROR')
    assert.ok(errorResponseSchema.safeParse(response.body).success)
  }
  const malformed = await api.patch('/api/users/me').set('Authorization', authorization)
    .set('Content-Type', 'application/json').send('{"displayName":').expect(400)
  assert.equal(malformed.body.error.code, 'INVALID_JSON')

  assert.equal(users.stored.get(accountA.id)!.displayName, accountA.displayName)
  assert.equal(users.stored.get(accountB.id)!.displayName, accountB.displayName)
})

test('an update by account A leaves account B unchanged, and B keeps reading its own profile', async () => {
  const users = memoryRepository()
  const { api } = fixture(users)
  await api.patch('/api/users/me').set('Authorization', await bearer(accountA.id))
    .send({ displayName: 'Camille Martin' }).expect(200)
  await api.get('/api/users/me').set('Authorization', await bearer(accountB.id))
    .expect(200, { data: { email: accountB.email, displayName: accountB.displayName } })
  assert.equal(users.stored.get(accountB.id)!.displayName, accountB.displayName)
})

test('requires valid authentication on both endpoints before reading the body', async () => {
  const users = memoryRepository()
  const { api } = fixture(users)
  const wrongKey = await createAccessTokens(Buffer.alloc(32, 8)).issue(accountA.id)
  const expired = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' })
    .setIssuer('mealplanner').setAudience('mealplanner-api').setSubject(accountA.id)
    .setIssuedAt(1).setExpirationTime(2).sign(secret)
  const headers = [undefined, 'Bearer', `Bearer ${wrongKey}`, `Bearer ${expired}`, 'Bearer invalid', `Basic ${accountA.id}`]

  for (const authorization of headers) {
    const withHeader = <T extends request.Test>(req: T) => authorization ? req.set('Authorization', authorization) : req
    for (const response of [
      await withHeader(api.get('/api/users/me')),
      await withHeader(api.patch('/api/users/me')).send({ displayName: 'Intruder' }),
    ]) {
      assert.equal(response.status, 401, `expected 401 for ${authorization ?? 'no header'}`)
      assert.equal(response.body.error.code, 'UNAUTHENTICATED')
      assert.ok(errorResponseSchema.safeParse(response.body).success)
    }
  }
  // An invalid body without credentials is still an authentication failure, not a validation one.
  await api.patch('/api/users/me').send({ displayName: '' }).expect(401)
  assert.equal(users.stored.get(accountA.id)!.displayName, accountA.displayName)
})

test('returns 404 when a valid token refers to an account that no longer exists', async () => {
  const users = memoryRepository()
  const { api } = fixture(users)
  users.stored.delete(accountA.id)
  const authorization = await bearer(accountA.id)
  for (const response of [
    await api.get('/api/users/me').set('Authorization', authorization),
    await api.patch('/api/users/me').set('Authorization', authorization).send({ displayName: 'Camille' }),
  ]) {
    assert.equal(response.status, 404)
    assert.equal(response.body.error.code, 'USER_NOT_FOUND')
    assert.ok(errorResponseSchema.safeParse(response.body).success)
  }
  assert.equal(users.stored.has(accountA.id), false)
})

test('stores the update in PostgreSQL for one of two accounts when TEST_DATABASE_URL is provided', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!)
  assert.match(url.pathname, /_test$/, 'Use a dedicated database whose name ends in _test.')
  const pool = new pg.Pool({ connectionString: url.toString(), connectionTimeoutMillis: 1000 })
  // One client inside a transaction that is always rolled back: the test database is left as it was.
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const repository = createUserRepository(client)
    const suffix = randomUUID()
    const a = await repository.createAccount(`a-${suffix}@example.test`, 'Account A', 'scrypt$test')
    const b = await repository.createAccount(`b-${suffix}@example.test`, 'Account B', 'scrypt$test')
    assert.ok(a && b)
    const { api } = fixture(repository)

    await api.patch('/api/users/me').set('Authorization', await bearer(a.id))
      .send({ displayName: '  Camille Martin  ' })
      .expect(200, { data: { email: a.email, displayName: 'Camille Martin' } })
    await api.get('/api/users/me').set('Authorization', await bearer(a.id))
      .expect(200, { data: { email: a.email, displayName: 'Camille Martin' } })
    await api.get('/api/users/me').set('Authorization', await bearer(b.id))
      .expect(200, { data: { email: b.email, displayName: 'Account B' } })
    await api.patch('/api/users/me').set('Authorization', await bearer(a.id)).send({ displayName: ' ' }).expect(400)

    const { rows } = await client.query<{ email: string; display_name: string }>(
      'SELECT email, display_name FROM users WHERE id = ANY($1) ORDER BY email', [[a.id, b.id]],
    )
    assert.deepEqual(rows, [
      { email: a.email, display_name: 'Camille Martin' },
      { email: b.email, display_name: 'Account B' },
    ])
  } finally {
    await client.query('ROLLBACK').catch(() => {})
    client.release()
    await pool.end()
  }
})
