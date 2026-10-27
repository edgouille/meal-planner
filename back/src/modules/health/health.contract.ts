import { errorResponseSchema } from '../../shared/http/errors.ts'
import { healthResponseSchema, readinessResponseSchema } from './health.schemas.ts'

// Consumed by future OpenAPI registration; importing contracts never connects to PostgreSQL.
export const healthContract = [
  {
    method: 'get', path: '/health', operationId: 'getHealth', tags: ['Health'], security: [],
    description: 'Process liveness. Does not query PostgreSQL.',
    responses: { 200: { description: 'Process is alive.', schema: healthResponseSchema } },
  },
  {
    method: 'get', path: '/ready', operationId: 'getReadiness', tags: ['Health'], security: [],
    description: 'Database readiness with a bounded SELECT 1 through the shared pool.',
    responses: {
      200: { description: 'PostgreSQL is available.', schema: readinessResponseSchema },
      503: { description: 'PostgreSQL is unavailable or timed out.', schema: errorResponseSchema },
    },
  },
] as const
