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
  const stored = new Map<string, MealPlan>()
  const memory: MealPlanRepository = {
    async listForUser(userId, query) {
      return userId === accountA ? [...stored.values()].filter(row => row.date >= query.startDate && row.date <= query.endDate) : []
    },
    async createForUser(userId, input) {
      if (userId !== accountA || input.recipeId !== recipeId) return null
      if ([...stored.values()].some(row => row.date === input.date && row.moment === input.moment)) throw { code: '23505' }
      const created = { ...meal, date: input.date, moment: input.moment }
      stored.set(created.id, created)
      return created
    },
    async deleteForUser(userId, id) { return userId === accountA && stored.delete(id) },
  }
  return request(createApp({ modules: [createMealPlansModule(repository ?? memory, requireAuthentication(tokens))], logger: () => {} }))
}

test('planning persists a meal, filters dates, isolates accounts and removes the owned meal', async () => {
  const api = fixture()
  const auth = await bearer()
  await api.get('/api/meal-plans').query(range).set('Authorization', auth).expect(200, { data: [] })
  const created = await api.post('/api/meal-plans').set('Authorization', auth)
    .send({ recipeId, date: meal.date, moment: meal.moment }).expect(201)
  assert.deepEqual(created.body, { data: meal })
  assert.equal(created.headers['cache-control'], 'no-store')
  await api.get('/api/meal-plans').query(range).set('Authorization', auth).expect(200, { data: [meal] })
  await api.get('/api/meal-plans').query({ startDate: '2026-11-23', endDate: '2026-11-29' }).set('Authorization', auth).expect(200, { data: [] })
  await api.get('/api/meal-plans').query(range).set('Authorization', await bearer(accountB)).expect(200, { data: [] })
  await api.delete('/api/meal-plans/' + meal.id).set('Authorization', await bearer(accountB)).expect(404)
  await api.post('/api/meal-plans').set('Authorization', auth).send({ recipeId, date: meal.date, moment: meal.moment })
    .expect(409).expect(({ body }) => assert.equal(body.error.code, 'SLOT_OCCUPIED'))
  await api.post('/api/meal-plans').set('Authorization', await bearer(accountB)).send({ recipeId, date: meal.date, moment: meal.moment }).expect(404)
  await api.delete('/api/meal-plans/' + meal.id).set('Authorization', auth).expect(204)
  await api.get('/api/meal-plans').query(range).set('Authorization', auth).expect(200, { data: [] })
  await api.delete('/api/meal-plans/' + meal.id).set('Authorization', auth).expect(404)
})

test('rejects invalid dates, reversed or overlong ranges, foreign fields and invalid meals', async () => {
  const api = fixture()
  const auth = await bearer()
  for (const query of [{}, { ...range, startDate: '2026-02-30' }, { ...range, startDate: '2026-11-23' },
    { ...range, endDate: '2027-01-01' }, { ...range, userId: accountB }]) {
    await api.get('/api/meal-plans').query(query).set('Authorization', auth).expect(400)
  }
  for (const body of [{}, { recipeId, date: '2026-02-30', moment: 'lunch' },
    { recipeId, date: meal.date, moment: 'snack' },
    { recipeId, date: meal.date, moment: 'lunch', servings: 99 },
    { recipeId, date: meal.date, moment: 'lunch', userId: accountB }]) {
    await api.post('/api/meal-plans').set('Authorization', auth).send(body).expect(400)
  }
  await api.delete('/api/meal-plans/invalid').set('Authorization', auth).expect(400)
  for (const authorization of ['', 'Bearer invalid']) {
    await api.get('/api/meal-plans').set('Authorization', authorization).expect(401)
    await api.post('/api/meal-plans').set('Authorization', authorization).send({}).expect(401)
    await api.delete('/api/meal-plans/invalid').set('Authorization', authorization).expect(401)
  }
})

test('unexpected planning failures use the shared sanitized error response', async () => {
  const api = fixture({
    async listForUser() { throw new Error('secret SQL') },
    async createForUser() { throw new Error('secret SQL') },
    async deleteForUser() { throw new Error('secret SQL') },
  })
  const response = await api.get('/api/meal-plans').query(range).set('Authorization', await bearer()).expect(500)
  assert.equal(response.body.error.code, 'INTERNAL_ERROR')
  assert.doesNotMatch(JSON.stringify(response.body), /secret|SQL/)
})

test('PostgreSQL persists calendar dates and recipe servings, rejects concurrent duplicate slots and scopes deletion', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!)
  assert.match(url.pathname, /_test$/, 'Use a dedicated test database.')
  const pool = new pg.Pool({ connectionString: url.toString() })
  try {
    await pool.query('INSERT INTO users (id, email, display_name, password_hash) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)',
      [accountA, `a-${accountA}@example.test`, 'A', 'test', accountB, `b-${accountB}@example.test`, 'B', 'test'])
    await pool.query('INSERT INTO recipes (id, user_id, title, servings) VALUES ($1, $2, $3, $4)', [recipeId, accountA, meal.recipe.title, meal.servings])
    const api = fixture(createMealPlanRepository(pool))
    const auth = await bearer()
    const payload = { recipeId, date: meal.date, moment: meal.moment }
    const responses = await Promise.all([
      api.post('/api/meal-plans').set('Authorization', auth).send(payload),
      api.post('/api/meal-plans').set('Authorization', auth).send(payload),
    ])
    const [created, conflict] = responses.sort((first, second) => first.status - second.status)
    assert.equal(created.status, 201)
    assert.equal(conflict.status, 409)
    assert.equal(conflict.body.error.code, 'SLOT_OCCUPIED')

    const row = created.body.data
    assert.equal(row.servings, meal.servings)
    assert.equal(row.date, meal.date)
    const { rows } = await pool.query('SELECT id FROM planned_meals WHERE user_id = $1', [accountA])
    assert.deepEqual(rows, [{ id: row.id }])
    await api.get('/api/meal-plans').query(range).set('Authorization', auth).expect(200, { data: [row] })
    await api.post('/api/meal-plans').set('Authorization', await bearer(accountB)).send({ recipeId, date: meal.date, moment: 'dinner' }).expect(404)
    await api.delete('/api/meal-plans/' + row.id).set('Authorization', await bearer(accountB)).expect(404)
    await api.delete('/api/meal-plans/' + row.id).set('Authorization', auth).expect(204)
    await api.get('/api/meal-plans').query(range).set('Authorization', auth).expect(200, { data: [] })
  } finally {
    try {
      await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [accountA, accountB])
    } finally {
      await pool.end()
    }
  }
})
