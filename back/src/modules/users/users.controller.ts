import type { RequestHandler, Response } from 'express'
import { validatedRequest } from '../../shared/http/validate-request.ts'
import type { User } from './users.model.ts'
import { usersContract } from './users.contract.ts'
import { profileResponseSchema } from './users.schemas.ts'
import type { UsersService } from './users.service.ts'

/** Set by the authentication middleware mounted before these handlers. */
function authenticatedUserId(res: Response): string {
  const userId: unknown = res.locals.auth?.userId
  if (typeof userId !== 'string') throw new Error('Authentication middleware is missing.')
  return userId
}

// Parsing through the response schema keeps only public fields (no id, createdAt, or password hash).
function sendProfile(res: Response, user: User) {
  res.set('Cache-Control', 'no-store').json(profileResponseSchema.parse({ data: user }))
}

export function createUsersController(service: UsersService) {
  const getProfile: RequestHandler = async (_req, res) => {
    sendProfile(res, await service.getProfile(authenticatedUserId(res)))
  }

  const updateProfile: RequestHandler = async (_req, res) => {
    const { body } = validatedRequest(usersContract.updateProfile.request, res)
    sendProfile(res, await service.updateProfile(authenticatedUserId(res), body))
  }

  return { getProfile, updateProfile }
}
