import { Router } from 'express'
import type { ApiModule } from '../../shared/http/api-module.ts'
import { validatedRequest, validateRequest } from '../../shared/http/validate-request.ts'
import { authBasePath, authContract } from './auth.contract.ts'
import { createAuthService, type AccountRepository } from './auth.service.ts'
import type { AccessTokens } from './auth.tokens.ts'

export { authBasePath, authContract } from './auth.contract.ts'
export { createAccessTokens, requireAuthentication } from './auth.tokens.ts'
export type { AccountRepository } from './auth.service.ts'

export function createAuthModule(users: AccountRepository, tokens: AccessTokens): ApiModule {
  const router = Router()
  const service = createAuthService(users, tokens)
  const { register, login } = authContract

  router[register.method](register.path, validateRequest(register.request), async (_req, res) => {
    const { body } = validatedRequest(register.request, res)
    res.set('Cache-Control', 'no-store').status(201).json({ data: await service.register(body) })
  })

  router[login.method](login.path, validateRequest(login.request), async (_req, res) => {
    const { body } = validatedRequest(login.request, res)
    res.set('Cache-Control', 'no-store').json({ data: await service.login(body) })
  })

  return { basePath: authBasePath, router }
}
