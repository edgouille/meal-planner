import type { RequestHandler } from 'express'
import { ApiError } from '../../shared/http/errors.ts'
import type { HealthService } from './health.service.ts'
import type { HealthResponse, ReadinessResponse } from './health.schemas.ts'

export function createHealthController(service: HealthService) {
  const health: RequestHandler = (_req, res) => {
    res.json({ data: { status: 'ok' } } satisfies HealthResponse)
  }
  const ready: RequestHandler = async (_req, res) => {
    if (!await service.isReady()) {
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is temporarily unavailable.')
    }
    res.json({ data: { status: 'ready' } } satisfies ReadinessResponse)
  }
  return { health, ready }
}
