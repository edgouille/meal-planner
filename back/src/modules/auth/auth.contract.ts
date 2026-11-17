import { errorResponseSchema } from '../../shared/http/errors.ts'
import { authResponseSchema, loginBody, registerBody } from './auth.schemas.ts'

export const authBasePath = '/api/auth'

export const authContract = {
  register: {
    method: 'post', path: '/register', operationId: 'registerUser', tags: ['Auth'], security: [],
    description: 'Create an account and issue a bearer access token.',
    request: { body: registerBody },
    responses: {
      201: { description: 'Account created.', schema: authResponseSchema },
      400: { description: 'Invalid input.', schema: errorResponseSchema },
      409: { description: 'Email already registered.', schema: errorResponseSchema },
    },
  },
  login: {
    method: 'post', path: '/login', operationId: 'loginUser', tags: ['Auth'], security: [],
    description: 'Verify credentials and issue a bearer access token.',
    request: { body: loginBody },
    responses: {
      200: { description: 'Signed in.', schema: authResponseSchema },
      400: { description: 'Invalid input.', schema: errorResponseSchema },
      401: { description: 'Invalid credentials.', schema: errorResponseSchema },
    },
  },
} as const
