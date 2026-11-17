import { ApiError } from '../../shared/http/errors.ts'
import type { User, UserRepository } from '../users/index.ts'
import { hashPassword, verifyPassword } from './auth.password.ts'
import type { LoginInput, RegisterInput } from './auth.schemas.ts'
import { accessTokenLifetimeSeconds, type AccessTokens } from './auth.tokens.ts'

export function createAuthService(users: UserRepository, tokens: AccessTokens) {
  async function session({ id, email, displayName }: User) {
    return {
      accessToken: await tokens.issue(id),
      tokenType: 'Bearer' as const,
      expiresIn: accessTokenLifetimeSeconds,
      user: { id, email, displayName },
    }
  }

  return {
    async register({ email, password, displayName }: RegisterInput) {
      const user = await users.createAccount(email, displayName, await hashPassword(password))
      if (!user) throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'This email address is already registered.')
      return session(user)
    },

    async login({ email, password }: LoginInput) {
      const account = await users.findAccountByEmail(email)
      const matches = await verifyPassword(password, account?.passwordHash)
      if (!account || !matches) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
      return session(account.user)
    },
  }
}
