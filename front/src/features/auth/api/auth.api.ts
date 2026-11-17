import { apiRequest } from '../../../shared/api/client.ts'
import type { AuthResponse, AuthSession, LoginInput, RegisterInput } from '../auth.types.ts'

export async function login(input: LoginInput, signal?: AbortSignal) {
  const response = await apiRequest<AuthResponse>('/api/auth/login', { method: 'POST', body: input, signal })
  return toSession(response)
}

export async function register(input: RegisterInput, signal?: AbortSignal) {
  const response = await apiRequest<AuthResponse>('/api/auth/register', { method: 'POST', body: input, signal })
  return toSession(response)
}

function toSession({ data }: AuthResponse): AuthSession {
  return { accessToken: data.accessToken, expiresAt: Date.now() + data.expiresIn * 1000, user: data.user }
}
