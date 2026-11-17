import { apiRequest } from '../../../shared/api/client.ts'
import type { ProfileResponse, UpdateProfileInput } from '../users.types.ts'

export async function getProfile(signal?: AbortSignal) {
  const { data } = await apiRequest<ProfileResponse>('/api/users/me', { authenticated: true, signal })
  return data
}

export async function updateProfile({ displayName }: UpdateProfileInput, signal?: AbortSignal) {
  // Send only the editable field: the API rejects any other property.
  const { data } = await apiRequest<ProfileResponse>('/api/users/me', {
    method: 'PATCH',
    body: { displayName },
    authenticated: true,
    signal,
  })
  return data
}
