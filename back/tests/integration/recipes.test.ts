import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { SignJWT } from 'jose'
import pg from 'pg'
import request from 'supertest'
import { createApp } from '../../src/app.ts'
import { createAccessTokens, requireAuthentication } from '../../src/modules/auth/index.ts'
import { createRecipeRepository, createRecipesModule, recipeListResponseSchema, type RecipeRepository, type RecipeSummary } from '../../src/modules/recipes/index.ts'
import { errorResponseSchema } from '../../src/shared/http/errors.ts'

const secret = Buffer.alloc(32, 9)
const tokens = createAccessTokens(secret)
const accountA = randomUUID()
const accountB = randomUUID()
const recipe = (title: string): RecipeSummary => ({ id: randomUUID(), title, description: null, prepMinutes: null, servings: 2 })

function fixture(repository?: RecipeRepository) {
  const stored = new Map<string, RecipeSummary[]>([[accountA, [recipe('Salade verte'), recipe('Soupe du jardin'), recipe('Tarte aux pommes')]], [accountB, [recipe('Recette privée')]]])
  const calls: string[] = []
  const memory: RecipeRepository = { async listForUser(userId, { q, page, pageSize }) {
    calls.push(userId)
    const matches = (stored.get(userId) ?? []).filter(row => row.title.toLowerCase().includes(q.toLowerCase()))
    return { data: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length }
  } }
  const app = createApp({ modules: [createRecipesModule(repository ?? memory, requireAuthentication(tokens))], logger: () => {} })
  return { api: request(app), stored, calls }
}

const bearer = async (userId = accountA) => `Bearer ${await tokens.issue(userId)}`

test('lists only the authenticated account recipes with pagination and public fields', async () => {
  const { api, stored, calls } = fixture()
  const response = await api.get('/api/recipes').set('Authorization', await bearer()).expect(200)
  assert.deepEqual(response.body, { data: stored.get(accountA), pagination: { page: 1, pageSize: 20, total: 3 } })
  assert.equal(response.headers['cache-control'], 'no-store')
  assert.ok(recipeListResponseSchema.safeParse(response.body).success)
  assert.deepEqual(calls, [accountA])
  const second = await api.get('/api/recipes?page=2&pageSize=2').set('Authorization', await bearer()).expect(200)
  assert.deepEqual(second.body.data, stored.get(accountA)!.slice(2))
  assert.deepEqual(second.body.pagination, { page: 2, pageSize: 2, total: 3 })
  await api.get('/api/recipes').set('Authorization', await bearer(accountB))
    .expect(200, { data: stored.get(accountB), pagination: { page: 1, pageSize: 20, total: 1 } })
})

test('filters by title case-insensitively, trims whitespace, and preserves filtered totals', async () => {
  const { api } = fixture()
  const authorization = await bearer()
  const response = await api.get('/api/recipes').query({ q: '  SOUPE  ', pageSize: 1 }).set('Authorization', authorization).expect(200)
  assert.equal(response.body.data[0].title, 'Soupe du jardin')
  assert.equal(response.body.pagination.total, 1)
  const beyond = await api.get('/api/recipes?q=soupe&page=2&pageSize=1').set('Authorization', authorization).expect(200)
  assert.deepEqual(beyond.body, { data: [], pagination: { page: 2, pageSize: 1, total: 1 } })
  const all = await api.get('/api/recipes').query({ q: '   ' }).set('Authorization', authorization).expect(200)
  assert.equal(all.body.pagination.total, 3)
})

test('empty accounts and searches return an empty list', async () => {
  const { api } = fixture()
  await api.get('/api/recipes').set('Authorization', await bearer(randomUUID()))
    .expect(200, { data: [], pagination: { page: 1, pageSize: 20, total: 0 } })
  await api.get('/api/recipes?q=absent').set('Authorization', await bearer())
    .expect(200, { data: [], pagination: { page: 1, pageSize: 20, total: 0 } })
})

test('rejects invalid queries and user-ID overrides before querying the repository', async () => {
  const { api, calls } = fixture()
  const authorization = await bearer()
  for (const query of [
    { page: 0 }, { page: 1.5 }, { page: 1_000_001 }, { page: 'invalid' },
    { pageSize: 0 }, { pageSize: 101 }, { pageSize: 1.5 }, { q: 'a'.repeat(151) },
    { q: '\0' }, { q: ['one', 'two'] }, { userId: accountB }, { user_id: accountB },
  ]) {
    const response = await api.get('/api/recipes').query(query).set('Authorization', authorization).expect(400)
    assert.equal(response.body.error.code, 'VALIDATION_ERROR')
    assert.ok(errorResponseSchema.safeParse(response.body).success)
  }
  assert.deepEqual(calls, [])
})

test('requires valid authentication before query validation', async () => {
  const { api, calls } = fixture()
  const expired = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(accountA)
    .setIssuer('mealplanner').setAudience('mealplanner-api').setIssuedAt(1).setExpirationTime(2).sign(secret)
  for (const authorization of ['', 'Bearer invalid', `Bearer ${expired}`]) {
    const response = await api.get('/api/recipes?page=invalid').set('Authorization', authorization).expect(401)
    assert.equal(response.body.error.code, 'UNAUTHENTICATED')
  }
  assert.deepEqual(calls, [])
})

test('sanitizes repository failures without exposing SQL or account data', async () => {
  const { api } = fixture({ async listForUser() { throw new Error('SELECT password FROM secret_table') } })
  const response = await api.get('/api/recipes').set('Authorization', await bearer()).expect(500)
  assert.equal(response.body.error.code, 'INTERNAL_ERROR')
  assert.doesNotMatch(JSON.stringify(response.body), /SELECT|password|secret_table|stack/)
})

test('PostgreSQL scopes rows and counts to each account, with literal searches and stable pagination', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!)
  assert.match(url.pathname, /_test$/, 'Use a dedicated database whose name ends in _test.')
  const pool = new pg.Pool({ connectionString: url.toString(), connectionTimeoutMillis: 1000 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('INSERT INTO users (id, email, display_name, password_hash) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)',
      [accountA, `a-${accountA}@example.test`, 'Account A', 'test-only', accountB, `b-${accountB}@example.test`, 'Account B', 'test-only'])
    const first = recipe('Soupe 100%_maison')
    const second = recipe('Tarte aux pommes')
    for (const [owner, row] of [[accountA, first], [accountA, second], [accountB, recipe('Soupe privée')]] as const) {
      await client.query('INSERT INTO recipes (id, user_id, title, description, prep_minutes, servings) VALUES ($1, $2, $3, $4, $5, $6)',
        [row.id, owner, row.title, row.description, row.prepMinutes, row.servings])
    }
    const { api } = fixture(createRecipeRepository(client))
    const authorization = await bearer()
    await api.get('/api/recipes?pageSize=1').set('Authorization', authorization)
      .expect(200, { data: [first], pagination: { page: 1, pageSize: 1, total: 2 } })
    await api.get('/api/recipes?page=2&pageSize=1').set('Authorization', authorization)
      .expect(200, { data: [second], pagination: { page: 2, pageSize: 1, total: 2 } })
    await api.get('/api/recipes?page=3&pageSize=1').set('Authorization', authorization)
      .expect(200, { data: [], pagination: { page: 3, pageSize: 1, total: 2 } })
    for (const q of ['SOUPe', '%_', '100%_']) {
      await api.get('/api/recipes').query({ q }).set('Authorization', authorization)
        .expect(200, { data: [first], pagination: { page: 1, pageSize: 20, total: 1 } })
    }
    await api.get('/api/recipes').query({ q: "' OR 1=1 --" }).set('Authorization', authorization)
      .expect(200, { data: [], pagination: { page: 1, pageSize: 20, total: 0 } })
    const b = await api.get('/api/recipes').set('Authorization', await bearer(accountB)).expect(200)
    assert.equal(b.body.pagination.total, 1)
    assert.equal(b.body.data[0].title, 'Soupe privée')
  } finally {
    await client.query('ROLLBACK').catch(() => {})
    client.release()
    await pool.end()
  }
})
