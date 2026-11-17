import type { RequestHandler } from 'express'
import type { ApiModule } from '../../shared/http/api-module.ts'
import { usersBasePath } from './users.contract.ts'
import { createUsersRouter } from './users.routes.ts'
import { createUsersService, type ProfileRepository } from './users.service.ts'

export { createUserRepository, type UserRepository } from './users.repository.ts'
export type { User } from './users.model.ts'
export { usersBasePath, usersContract } from './users.contract.ts'
export { profileResponseSchema, updateProfileBody } from './users.schemas.ts'
export type { Profile, ProfileResponse, UpdateProfileInput } from './users.schemas.ts'

/**
 * `authenticate` must verify the caller and set `res.locals.auth.userId`; the server passes
 * `requireAuthentication(tokens)` from the auth module.
 */
export function createUsersModule(users: ProfileRepository, authenticate: RequestHandler): ApiModule {
  return { basePath: usersBasePath, router: createUsersRouter(createUsersService(users), authenticate) }
}
