import { SignJWT, jwtVerify } from 'jose'
import type { RequestHandler } from 'express'
import { z } from 'zod'
import { ApiError } from '../../shared/http/errors.ts'

const issuer = 'mealplanner'
const audience = 'mealplanner-api'
const algorithm = 'HS256'
export const accessTokenLifetimeSeconds = 3600

export function createAccessTokens(secret: Uint8Array) {
  return {
    issue(userId: string) {
      return new SignJWT({})
        .setProtectedHeader({ alg: algorithm })
        .setIssuer(issuer)
        .setAudience(audience)
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(`${accessTokenLifetimeSeconds}s`)
        .sign(secret)
    },

    async verify(token: string) {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: [algorithm], issuer, audience, requiredClaims: ['sub', 'iat', 'exp'],
      })
      return z.uuid().parse(payload.sub)
    },
  }
}

export type AccessTokens = ReturnType<typeof createAccessTokens>

export function requireAuthentication(tokens: AccessTokens): RequestHandler {
  return async (req, res, next) => {
    const token = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1]
    if (token) {
      try {
        res.locals.auth = { userId: await tokens.verify(token) }
      } catch {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.')
      }
      next()
      return
    }
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.')
  }
}
