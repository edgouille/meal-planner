import { ApiError } from '../../shared/http/errors.ts'
import type { User } from './users.model.ts'
import type { UserRepository } from './users.repository.ts'
import type { UpdateProfileInput } from './users.schemas.ts'

export type ProfileRepository = Pick<UserRepository, 'findById' | 'updateDisplayName'>

// A valid token can outlive its account; report it instead of returning an empty profile.
function found(user: User | null) {
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'The user account was not found.')
  return user
}

/** Every operation is scoped to the authenticated user ID; callers never choose whose profile they touch. */
export function createUsersService(users: ProfileRepository) {
  return {
    async getProfile(userId: string) {
      return found(await users.findById(userId))
    },

    async updateProfile(userId: string, { displayName }: UpdateProfileInput) {
      return found(await users.updateDisplayName(userId, displayName))
    },
  }
}

export type UsersService = ReturnType<typeof createUsersService>
