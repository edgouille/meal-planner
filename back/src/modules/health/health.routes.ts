import { Router } from 'express'
import type { HealthService } from './health.service.ts'
import { createHealthController } from './health.controller.ts'
import { healthContract } from './health.contract.ts'

export function createHealthRouter(service: HealthService) {
  const router = Router()
  const controller = createHealthController(service)
  router[healthContract[0].method](healthContract[0].path, controller.health)
  router[healthContract[1].method](healthContract[1].path, controller.ready)
  return router
}
