import { Router, type RequestHandler } from 'express'
import { validateRequest } from '../../shared/http/validate-request.ts'
import { createUsersController } from './users.controller.ts'
import { usersContract } from './users.contract.ts'
import type { UsersService } from './users.service.ts'

export function createUsersRouter(service: UsersService, authenticate: RequestHandler) {
  const router = Router()
  const controller = createUsersController(service)
  const { getProfile, updateProfile } = usersContract

  // Authentication runs first, so an anonymous request gets 401 before its body is validated.
  router[getProfile.method](getProfile.path, authenticate, controller.getProfile)
  router[updateProfile.method](updateProfile.path, authenticate, validateRequest(updateProfile.request), controller.updateProfile)
  return router
}
