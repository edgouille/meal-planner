import assert from 'node:assert/strict'
import { scryptSync } from 'node:crypto'
import { test } from 'node:test'
import { Router } from 'express'
import { SignJWT } from 'jose'
import request from 'supertest'
import { createApp } from '../../src/app.ts'
import { requireAuthJwtSecret } from '../../src/config/env.ts'
import { createAccessTokens, createAuthModule, requireAuthentication } from '../../src/modules/auth/index.ts'
import type { User, UserRepository } from '../../src/modules/users/index.ts'

const userId = '9a88e1e8-d81d-41eb-9f73-cc14e2128b50'
const secret = Buffer.alloc(32, 1)
const password = 'a local test password'

function fixture() {
  const accounts = new Map<string, { user: User; passwordHash: string }>()
  const users: UserRepository = {
    async createAccount(email, displayName, passwordHash) {
      if (accounts.has(email)) return null
      const user = { id: userId, email, displayName, createdAt: new Date() }
      accounts.set(email, { user, passwordHash })
      return user
    },
    async findAccountByEmail(email) {
      return accounts.get(email) ?? null
    },
  }
  const tokens = createAccessTokens(secret)
  const protectedRouter = Router().get('/test-profile', requireAuthentication(tokens), (_req, res) => {
    res.json({ data: res.locals.auth })
  })
  const app = createApp({
    modules: [createAuthModule(users, tokens), { basePath: '/', router: protectedRouter }],
    logger: () => {},
  })
  return { accounts, api: request(app) }
}

test('registers a normalized account, logs in, and passes the verified identity to a protected route', async () => {
  const { api, accounts } = fixture()
  const registration = await api.post('/api/auth/register')
    .set('Origin', 'http://localhost:5173')
    .send({ email: ' Camille@Example.test ', displayName: ' Camille Martin ', password })
    .expect(201)
    .expect('Access-Control-Allow-Origin', 'http://localhost:5173')
    .expect('Cache-Control', 'no-store')
  assert.deepEqual(registration.body.data.user, {
    id: userId, email: 'camille@example.test', displayName: 'Camille Martin',
  })
  assert.equal(registration.body.data.tokenType, 'Bearer')
  assert.equal(registration.body.data.expiresIn, 3600)
  assert.match(accounts.get('camille@example.test')!.passwordHash, /^scrypt\$/)
  assert.doesNotMatch(JSON.stringify(registration.body), /password/i)
  await api.get('/test-profile').set('Authorization', `Bearer ${registration.body.data.accessToken}`)
    .expect(200, { data: { userId } })

  await api.post('/api/auth/register')
    .send({ email: 'CAMILLE@example.test', displayName: 'Another name', password })
    .expect(409)
    .expect(({ body }) => assert.equal(body.error.code, 'EMAIL_ALREADY_REGISTERED'))
  const login = await api.post('/api/auth/login').send({ email: 'CAMILLE@example.test', password })
    .expect(200).expect('Cache-Control', 'no-store')
  assert.deepEqual(login.body.data.user, registration.body.data.user)
  await api.get('/test-profile').set('Authorization', `Bearer ${login.body.data.accessToken}`)
    .expect(200, { data: { userId } })
})

test('accepts seeded passwords and returns identical errors for a wrong password and an unknown account', async () => {
  const { api, accounts } = fixture()
  const email = 'demo@mealplanner.local'
  const salt = Buffer.alloc(16, 2)
  const hash = scryptSync('mealplanner-demo', salt, 64)
  accounts.set(email, {
    user: { id: userId, email, displayName: 'Compte démo', createdAt: new Date() },
    passwordHash: `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`,
  })
  await api.post('/api/auth/login').send({ email, password: 'mealplanner-demo' }).expect(200)
  const wrong = await api.post('/api/auth/login').send({ email, password: 'wrong' }).expect(401)
  const unknown = await api.post('/api/auth/login').send({ email: 'unknown@example.test', password: 'wrong' }).expect(401)
  assert.equal(wrong.body.error.code, 'INVALID_CREDENTIALS')
  assert.deepEqual(wrong.body, unknown.body)
})

test('rejects invalid request bodies and invalid, expired, or missing access tokens', async () => {
  const { api, accounts } = fixture()
  await api.post('/api/auth/register').send({ email: 'camille@example.test', displayName: 'Camille', password: 'short' })
    .expect(400).expect(({ body }) => assert.equal(body.error.code, 'VALIDATION_ERROR'))
  await api.post('/api/auth/register').send({ email: 'camille@example.test', displayName: '\0', password }).expect(400)
  await api.post('/api/auth/login').send({ email: 'bad', password }).expect(400)
  assert.equal(accounts.size, 0)

  await api.get('/test-profile').expect(401)
  const wrongKey = await createAccessTokens(Buffer.alloc(32, 2)).issue(userId)
  const expired = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' })
    .setIssuer('mealplanner').setAudience('mealplanner-api').setSubject(userId)
    .setIssuedAt(1).setExpirationTime(2).sign(secret)
  for (const token of [wrongKey, expired, 'invalid']) {
    await api.get('/test-profile').set('Authorization', `Bearer ${token}`)
      .expect(401).expect(({ body }) => assert.equal(body.error.code, 'UNAUTHENTICATED'))
  }
})

test('requires a 32-byte hex JWT signing key', () => {
  for (const invalid of [undefined, '', 'too-short', 'z'.repeat(64)]) {
    assert.throws(() => requireAuthJwtSecret(invalid), /AUTH_JWT_SECRET/)
  }
  assert.deepEqual(requireAuthJwtSecret('01'.repeat(32)), secret)
})
