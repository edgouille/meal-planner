import { errorResponseSchema } from '../../shared/http/errors.ts'
import { profileResponseSchema, updateProfileBody } from './users.schemas.ts'

export const usersBasePath = '/api/users'

const example = { data: { email: 'camille@example.test', displayName: 'Camille Martin' } }

// Consumed by future OpenAPI registration (SCRUM-54); importing contracts never connects to PostgreSQL.
export const usersContract = {
  getProfile: {
    method: 'get', path: '/me', operationId: 'getCurrentUserProfile', tags: ['Users'],
    security: [{ bearerAuth: [] }],
    description: 'Read the signed-in user\'s profile. The user is identified by the bearer token only.',
    request: {},
    responses: {
      200: { description: 'Current profile.', schema: profileResponseSchema, example },
      401: { description: 'Missing, invalid, or expired access token (UNAUTHENTICATED).', schema: errorResponseSchema },
      404: { description: 'The account no longer exists (USER_NOT_FOUND).', schema: errorResponseSchema },
    },
  },
  updateProfile: {
    method: 'patch', path: '/me', operationId: 'updateCurrentUserProfile', tags: ['Users'],
    security: [{ bearerAuth: [] }],
    description: 'Change the signed-in user\'s display name. The name is trimmed and must contain 1–100 characters; other fields are rejected.',
    request: { body: updateProfileBody },
    responses: {
      200: { description: 'Updated profile.', schema: profileResponseSchema, example },
      400: { description: 'Invalid body (VALIDATION_ERROR or INVALID_JSON). The stored profile is unchanged.', schema: errorResponseSchema },
      401: { description: 'Missing, invalid, or expired access token (UNAUTHENTICATED).', schema: errorResponseSchema },
      404: { description: 'The account no longer exists (USER_NOT_FOUND).', schema: errorResponseSchema },
    },
  },
} as const
