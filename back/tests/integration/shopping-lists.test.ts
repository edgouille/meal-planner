import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import pg from 'pg'
import request from 'supertest'
import { createApp } from '../../src/app.ts'
import { createAccessTokens, requireAuthentication } from '../../src/modules/auth/index.ts'
import {
  createShoppingListRepository, createShoppingListsModule, type ShoppingList, type ShoppingListRepository,
} from '../../src/modules/shopping-lists/index.ts'

const accountA = randomUUID(), accountB = randomUUID()
const chickpeas = randomUUID(), onion = randomUUID()
const tokens = createAccessTokens(Buffer.alloc(32, 7))
const bearer = async (userId = accountA) => `Bearer ${await tokens.issue(userId)}`
const week = { startDate: '2026-11-16', endDate: '2026-11-22' }

// In-memory repository: account A has two planned meals in the week, account B has none.
function fixture(repository?: ShoppingListRepository) {
  const lists = new Map<string, ShoppingList>()
  const memory: ShoppingListRepository = {
    async listPlannedIngredients(userId, period) {
      if (userId !== accountA || period.startDate !== week.startDate) return []
      return [
        { ingredientId: chickpeas, name: 'Pois chiches', quantity: 400, unit: 'g', recipeServings: 4, plannedServings: 4 },
        { ingredientId: chickpeas, name: 'Pois chiches', quantity: 400, unit: 'g', recipeServings: 4, plannedServings: 2 },
        { ingredientId: onion, name: 'Oignon', quantity: 1, unit: 'piece', recipeServings: 4, plannedServings: 4 },
      ]
    },
    async findForPeriod(userId, period) {
      return lists.get(`${userId}:${period.startDate}:${period.endDate}`) ?? null
    },
    async replaceForPeriod(userId, period, build) {
      const key = `${userId}:${period.startDate}:${period.endDate}`
      const items = build(lists.get(key)?.items ?? [])
      const list: ShoppingList = {
        id: randomUUID(), ...period, generatedAt: new Date().toISOString(),
        items: items.map(item => ({ ...item, id: randomUUID(), category: null })),
      }
      lists.set(key, list)
      return list
    },
    async updateItemForUser(userId, { listId, itemId }, { isPurchased }) {
      const list = [...lists.entries()].find(([key, value]) => key.startsWith(`${userId}:`) && value.id === listId)?.[1]
      const item = list?.items.find(candidate => candidate.id === itemId)
      if (!item) return null
      item.isPurchased = isPurchased
      return item
    },
  }
  return request(createApp({ modules: [createShoppingListsModule(repository ?? memory, requireAuthentication(tokens))], logger: () => {} }))
}

test('generates the list of a period from planned meals, groups quantities and makes it readable', async () => {
  const api = fixture()
  const auth = await bearer()
  await api.get('/api/shopping-lists').query(week).set('Authorization', auth).expect(200, { data: null })
  const generated = await api.post('/api/shopping-lists/generate').set('Authorization', auth).send(week).expect(201)
  assert.equal(generated.headers['cache-control'], 'no-store')
  const list = generated.body.data
  assert.equal(list.startDate, week.startDate)
  assert.equal(list.endDate, week.endDate)
  assert.deepEqual(list.items.map(({ label, quantity, unit, isPurchased }: ShoppingList['items'][number]) => [label, quantity, unit, isPurchased]), [
    ['Oignon', 1, 'piece', false], ['Pois chiches', 600, 'g', false],
  ])
  await api.get('/api/shopping-lists').query(week).set('Authorization', auth).expect(200, { data: list })
})

test('isolates accounts and returns an empty list when nothing is planned', async () => {
  const api = fixture()
  await api.post('/api/shopping-lists/generate').set('Authorization', await bearer()).send(week).expect(201)
  await api.get('/api/shopping-lists').query(week).set('Authorization', await bearer(accountB)).expect(200, { data: null })
  const empty = await api.post('/api/shopping-lists/generate').set('Authorization', await bearer(accountB)).send(week).expect(201)
  assert.deepEqual(empty.body.data.items, [])
})

test('checks and unchecks an owned item and keeps the state', async () => {
  const api = fixture()
  const auth = await bearer()
  const list = (await api.post('/api/shopping-lists/generate').set('Authorization', auth).send(week).expect(201)).body.data
  const item = list.items[0]
  const path = `/api/shopping-lists/${list.id}/items/${item.id}`
  const checked = await api.patch(path).set('Authorization', auth).send({ isPurchased: true }).expect(200)
  assert.deepEqual(checked.body, { data: { ...item, isPurchased: true } })
  assert.equal(checked.headers['cache-control'], 'no-store')
  const stored = (await api.get('/api/shopping-lists').query(week).set('Authorization', auth).expect(200)).body.data
  assert.equal(stored.items[0].isPurchased, true)
  await api.patch(path).set('Authorization', auth).send({ isPurchased: false }).expect(200)
    .expect(({ body }) => assert.equal(body.data.isPurchased, false))

  // Another account cannot read or change the item, and unknown items are not found.
  await api.patch(path).set('Authorization', await bearer(accountB)).send({ isPurchased: true }).expect(404)
    .expect(({ body }) => assert.equal(body.error.code, 'ITEM_NOT_FOUND'))
  await api.patch(`/api/shopping-lists/${list.id}/items/${randomUUID()}`).set('Authorization', auth).send({ isPurchased: true }).expect(404)
  await api.patch(`/api/shopping-lists/${randomUUID()}/items/${item.id}`).set('Authorization', auth).send({ isPurchased: true }).expect(404)

  for (const body of [{}, { isPurchased: 'yes' }, { isPurchased: true, label: 'Autre' }]) {
    await api.patch(path).set('Authorization', auth).send(body).expect(400)
  }
  await api.patch(`/api/shopping-lists/invalid/items/${item.id}`).set('Authorization', auth).send({ isPurchased: true }).expect(400)
  await api.patch(path).send({ isPurchased: true }).expect(401)
})

test('rejects invalid periods, foreign fields and missing authentication', async () => {
  const api = fixture()
  const auth = await bearer()
  for (const period of [{}, { ...week, startDate: '2026-02-30' }, { ...week, startDate: '2026-11-23' },
    { ...week, endDate: '2027-01-01' }, { ...week, userId: accountB }]) {
    await api.get('/api/shopping-lists').query(period).set('Authorization', auth).expect(400)
    await api.post('/api/shopping-lists/generate').send(period).set('Authorization', auth).expect(400)
  }
  for (const authorization of ['', 'Bearer invalid']) {
    await api.get('/api/shopping-lists').query(week).set('Authorization', authorization).expect(401)
    await api.post('/api/shopping-lists/generate').send(week).set('Authorization', authorization).expect(401)
  }
})

test('unexpected shopping list failures use the shared sanitized error response', async () => {
  const fail = async () => { throw new Error('secret SQL') }
  const api = fixture({ listPlannedIngredients: fail, findForPeriod: fail, replaceForPeriod: fail, updateItemForUser: fail })
  const response = await api.post('/api/shopping-lists/generate').set('Authorization', await bearer()).send(week).expect(500)
  assert.equal(response.body.error.code, 'INTERNAL_ERROR')
  assert.doesNotMatch(JSON.stringify(response.body), /secret|SQL/)
})

test('PostgreSQL generates from owned planned meals, replaces the period list and keeps purchases', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!)
  assert.match(url.pathname, /_test$/, 'Use a dedicated test database.')
  const pool = new pg.Pool({ connectionString: url.toString() })
  const recipeA = randomUUID(), recipeB = randomUUID()
  try {
    await pool.query('INSERT INTO users (id, email, display_name, password_hash) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)',
      [accountA, `a-${accountA}@example.test`, 'A', 'test', accountB, `b-${accountB}@example.test`, 'B', 'test'])
    await pool.query(`INSERT INTO ingredients (id, name, category) VALUES ($1, $2, 'légumineuses'), ($3, $4, 'légumes')`,
      [chickpeas, `Pois chiches ${chickpeas}`, onion, `Oignon ${onion} ${'x'.repeat(150)}`])
    await pool.query('INSERT INTO recipes (id, user_id, title, servings) VALUES ($1, $2, $3, 4), ($4, $5, $6, 2)',
      [recipeA, accountA, 'Curry', recipeB, accountB, 'Recette privée'])
    await pool.query(`INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
      ($1, $2, 400, 'g'), ($1, $3, 1, 'piece'), ($4, $2, 999, 'g')`, [recipeA, chickpeas, onion, recipeB])
    await pool.query(`INSERT INTO planned_meals (user_id, recipe_id, meal_date, moment, servings) VALUES
      ($1, $2, '2026-11-16', 'lunch', 4), ($1, $2, '2026-11-18', 'dinner', 2), ($1, $2, '2026-11-30', 'dinner', 4),
      ($3, $4, '2026-11-16', 'lunch', 2)`, [accountA, recipeA, accountB, recipeB])

    const api = fixture(createShoppingListRepository(pool))
    const auth = await bearer()
    const first = (await api.post('/api/shopping-lists/generate').set('Authorization', auth).send(week).expect(201)).body.data
    assert.deepEqual(first.items.map(({ category, quantity, unit }: ShoppingList['items'][number]) => [category, quantity, unit]), [
      ['légumes', 2, 'piece'], ['légumineuses', 600, 'g'],
    ])

    // A manual item and a purchase survive regeneration; a second list never accumulates.
    const chickpeaItem = first.items.find((item: ShoppingList['items'][number]) => item.ingredientId === chickpeas)
    const itemPath = `/api/shopping-lists/${first.id}/items/${chickpeaItem.id}`
    await api.patch(itemPath).set('Authorization', await bearer(accountB)).send({ isPurchased: true }).expect(404)
    const patched = await api.patch(itemPath).set('Authorization', auth).send({ isPurchased: true }).expect(200)
    assert.deepEqual(patched.body.data, { ...chickpeaItem, isPurchased: true })
    await pool.query(`INSERT INTO shopping_list_items (shopping_list_id, label, is_manual) VALUES ($1, 'Éponges', true)`, [first.id])
    const [second] = await Promise.all([
      api.post('/api/shopping-lists/generate').set('Authorization', auth).send(week).expect(201),
      api.post('/api/shopping-lists/generate').set('Authorization', auth).send(week).expect(201),
    ])
    const { rows } = await pool.query('SELECT count(*)::int AS lists FROM shopping_lists WHERE user_id = $1', [accountA])
    assert.equal(rows[0].lists, 1)
    const current = (await api.get('/api/shopping-lists').query(week).set('Authorization', auth).expect(200)).body.data
    assert.notEqual(second.body.data.id, first.id)
    assert.deepEqual(current.items.map(({ label, isPurchased, isManual }: ShoppingList['items'][number]) => [label.split(' ')[0], isPurchased, isManual]), [
      ['Oignon', false, false], ['Pois', true, false], ['Éponges', false, true],
    ])
    await api.get('/api/shopping-lists').query(week).set('Authorization', await bearer(accountB)).expect(200, { data: null })
  } finally {
    try {
      await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [accountA, accountB])
      await pool.query('DELETE FROM ingredients WHERE id IN ($1, $2)', [chickpeas, onion])
    } finally {
      await pool.end()
    }
  }
})
