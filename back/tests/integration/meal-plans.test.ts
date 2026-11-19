import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import pg from 'pg'
import request from 'supertest'
import { createApp } from '../../src/app.ts'
import { createAccessTokens, requireAuthentication } from '../../src/modules/auth/index.ts'
import { createMealPlanRepository, createMealPlansModule, type MealPlanRepository, type MealPlan } from '../../src/modules/meal-plans/index.ts'

const accountA = randomUUID(), accountB = randomUUID(), recipeId = randomUUID()
const tokens = createAccessTokens(Buffer.alloc(32, 8))
const meal: MealPlan = { id: randomUUID(), date: '2026-11-19', moment: 'lunch', servings: 2, recipe: { id: recipeId, title: 'Soupe du jardin' } }
const bearer = async (userId = accountA) => `Bearer ${await tokens.issue(userId)}`
const range = { startDate: '2026-11-16', endDate: '2026-11-22' }

function fixture(repository?: MealPlanRepository) {
  const memory: MealPlanRepository = {
    async listForUser(userId, query) {
      return userId === accountA && meal.date >= query.startDate && meal.date <= query.endDate ? [meal] : []
    },
  }
  return request(createApp({ modules: [createMealPlansModule(repository ?? memory, requireAuthentication(tokens))], logger: () => {} }))
}

test('lists only the authenticated account meals in an inclusive date range', async () => {
  const api = fixture()
  const auth = await bearer()
  await api.get('/api/meal-plans').query(range).set('Authorization', auth).expect(200, { data: [meal] })
  await api.get('/api/meal-plans').query({ startDate: meal.date, endDate: meal.date }).set('Authorization', auth).expect(200, { data: [meal] })
  await api.get('/api/meal-plans').query({ startDate: '2026-11-23', endDate: '2026-11-29' }).set('Authorization', auth).expect(200, { data: [] })
  await api.get('/api/meal-plans').query(range).set('Authorization', await bearer(accountB)).expect(200, { data: [] })
})

test('requires authentication and rejects invalid planning ranges', async () => {
  const api = fixture()
  const auth = await bearer()
  for (const query of [{}, { ...range, startDate: '2026-02-30' }, { ...range, startDate: '2026-11-23' },
    { ...range, endDate: '2027-01-01' }, { ...range, userId: accountB }]) {
    await api.get('/api/meal-plans').query(query).set('Authorization', auth).expect(400)
  }
  for (const authorization of ['', 'Bearer invalid']) {
    await api.get('/api/meal-plans').set('Authorization', authorization).expect(401)
  }
})

test('unexpected planning failures use the shared sanitized error response', async () => {
  const api = fixture({
    async listForUser() { throw new Error('secret SQL') },
  })
  const response = await api.get('/api/meal-plans').query(range).set('Authorization', await bearer()).expect(500)
  assert.equal(response.body.error.code, 'INTERNAL_ERROR')
  assert.doesNotMatch(JSON.stringify(response.body), /secret|SQL/)
})

test('PostgreSQL returns existing calendar dates and scopes reads to the owner', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!)
  assert.match(url.pathname, /_test$/, 'Use a dedicated test database.')
  const pool = new pg.Pool({ connectionString: url.toString() })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('INSERT INTO users (id, email, display_name, password_hash) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)',
      [accountA, `a-${accountA}@example.test`, 'A', 'test', accountB, `b-${accountB}@example.test`, 'B', 'test'])
    await client.query('INSERT INTO recipes (id, user_id, title, servings) VALUES ($1, $2, $3, $4)', [recipeId, accountA, meal.recipe.title, meal.servings])
    await client.query('INSERT INTO planned_meals (id, user_id, recipe_id, meal_date, moment, servings) VALUES ($1, $2, $3, $4, $5, $6)',
      [meal.id, accountA, recipeId, meal.date, meal.moment, meal.servings])

    const api = fixture(createMealPlanRepository(client))
    const auth = await bearer()
    await api.get('/api/meal-plans').query({ startDate: meal.date, endDate: meal.date }).set('Authorization', auth).expect(200, { data: [meal] })
    await api.get('/api/meal-plans').query({ startDate: '2026-11-23', endDate: '2026-11-29' }).set('Authorization', auth).expect(200, { data: [] })
    await api.get('/api/meal-plans').query(range).set('Authorization', await bearer(accountB)).expect(200, { data: [] })
  } finally {
    await client.query('ROLLBACK').catch(() => {})
    client.release()
    await pool.end()
  }
})
