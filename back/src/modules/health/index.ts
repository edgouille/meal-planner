import type { ApiModule } from '../../shared/http/api-module.ts'
import { createDatabaseProbe, type DatabasePool } from './health.repository.ts'
import { createHealthRouter } from './health.routes.ts'
import { createHealthService } from './health.service.ts'

export { healthContract } from './health.contract.ts'
export { healthResponseSchema, readinessResponseSchema } from './health.schemas.ts'
export type { HealthResponse, ReadinessResponse } from './health.schemas.ts'

export function createHealthModule({ pool, readinessTimeoutMs }: {
  pool: DatabasePool
  readinessTimeoutMs: number
}): ApiModule {
  const service = createHealthService(createDatabaseProbe(pool), readinessTimeoutMs)
  return { basePath: '/', router: createHealthRouter(service) }
}
