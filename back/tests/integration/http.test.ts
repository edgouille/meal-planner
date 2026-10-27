import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Router } from 'express'
import request from 'supertest'
import { z } from 'zod'
import { createApp } from '../../src/app.ts'
import { ApiError, errorResponseSchema } from '../../src/shared/http/errors.ts'
import { validateRequest, validatedRequest } from '../../src/shared/http/validate-request.ts'
import type { RequestLog } from '../../src/shared/logging/request-logger.ts'

const input = {
  body: z.object({ name: z.string().min(1) }),
  params: z.object({ id: z.uuid() }),
  query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
}
const id = 'e8f888ef-8593-4b2b-9500-d91cb7e17138'

function fixture() {
  const logs: RequestLog[] = []
  const router = Router()
  router.post('/items/:id', validateRequest(input), (_req, res) => {
    res.json({ data: validatedRequest(input, res) })
  })
  router.get('/unexpected', async () => { throw new Error('SELECT secret_password FROM private_tokens') })
  for (const status of [401, 403, 404, 409] as const) {
    router.get(`/errors/${status}`, () => { throw new ApiError(status, `ERROR_${status}`, 'Public message.') })
  }
  const app = createApp({ modules: [{ basePath: '/test', router }],
    frontendOrigin: 'https://frontend.example', logger: entry => logs.push(entry) })
  return { app, logs }
}

test('parses body, path and coerced/defaulted query values without mutating req.query', async () => {
  const { app } = fixture()
  const response = await request(app).post(`/test/items/${id}?page=2`).send({ name: 'Dinner' }).expect(200)
  assert.deepEqual(response.body.data, { body: { name: 'Dinner' }, params: { id }, query: { page: 2 } })
  const defaults = await request(app).post(`/test/items/${id}`).send({ name: 'Dinner' }).expect(200)
  assert.equal(defaults.body.data.query.page, 1)
})

test('returns public validation fields for invalid body, path and query input', async () => {
  const { app } = fixture()
  const response = await request(app).post('/test/items/not-a-uuid?page=zero').send({ name: '' }).expect(400)
  assert.equal(response.body.error.code, 'VALIDATION_ERROR')
  assert.deepEqual(response.body.error.details.map((d: { field: string }) => d.field), ['body.name', 'params.id', 'query.page'])
  assert.ok(errorResponseSchema.safeParse(response.body).success)
})

test('normalizes malformed JSON, oversized bodies and unknown routes', async () => {
  const { app } = fixture()
  const malformed = await request(app).post(`/test/items/${id}`).set('Content-Type', 'application/json').send('{').expect(400)
  assert.equal(malformed.body.error.code, 'INVALID_JSON')
  const oversized = await request(app).post(`/test/items/${id}`).send({ name: 'x'.repeat(1024 * 1024) }).expect(413)
  assert.equal(oversized.body.error.code, 'PAYLOAD_TOO_LARGE')
  const missing = await request(app).get('/missing?token=secret').expect(404)
  assert.equal(missing.body.error.code, 'NOT_FOUND')
  assert.doesNotMatch(JSON.stringify(missing.body), /secret/)
})

test('sanitizes asynchronous errors and logs only approved request metadata', async () => {
  const { app, logs } = fixture()
  const response = await request(app).get('/test/unexpected?token=secret')
    .set('Authorization', 'Bearer secret').set('Cookie', 'password=secret').expect(500)
  assert.deepEqual(response.body, { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', details: [] } })
  assert.ok(logs.some(entry => entry.event === 'request_error'))
  assert.ok(logs.some(entry => entry.event === 'request_completed' && entry.statusCode === 500))
  assert.match(response.headers['x-request-id'], /^[a-f\d-]{36}$/)
  assert.doesNotMatch(JSON.stringify(logs), /secret|password|SELECT|Bearer|token/)
  const body = await request(app).post(`/test/items/${id}`).send({ name: 'Dinner', password: 'hidden-password', token: 'hidden-token' }).expect(200)
  assert.equal(body.body.data.body.name, 'Dinner')
  assert.doesNotMatch(JSON.stringify(logs), /hidden-password|hidden-token/)
})

test('preserves public application errors for future feature modules', async () => {
  const { app } = fixture()
  for (const status of [401, 403, 404, 409]) {
    const response = await request(app).get(`/test/errors/${status}`).expect(status)
    assert.deepEqual(response.body, { error: { code: `ERROR_${status}`, message: 'Public message.', details: [] } })
  }
})

test('CORS advertises only the configured frontend origin, including preflight and errors', async () => {
  const { app, logs } = fixture()
  const allowed = await request(app).options('/test/items/any').set('Origin', 'https://frontend.example')
    .set('Access-Control-Request-Method', 'POST').expect(204)
  assert.equal(allowed.headers['access-control-allow-origin'], 'https://frontend.example')
  const denied = await request(app).get('/missing').set('Origin', 'https://other.example').expect(404)
  assert.notEqual(denied.headers['access-control-allow-origin'], 'https://other.example')
  assert.ok(logs.some(entry => entry.statusCode === 204))
})
