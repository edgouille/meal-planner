import { ApiError, networkErrorCode, type ApiErrorDetail } from './api-error.ts'

const baseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /** Sends the signed-in user's access token. A 401 response ends the session. */
  authenticated?: boolean
}

interface AuthenticationHandlers {
  getAccessToken: () => string | undefined
  /** Called when a protected request has no token or the API rejects it (expired or revoked). */
  onUnauthorized: () => void
}

// Registered by the application shell (src/app/), so this shared layer never imports a feature.
let authentication: AuthenticationHandlers | undefined

export function configureAuthentication(handlers: AuthenticationHandlers) {
  authentication = handlers
}

export async function apiRequest<T>(path: string, { method = 'GET', body, signal, authenticated = false }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (authenticated) {
    const token = authentication?.getAccessToken()
    if (!token) throw unauthorized()
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      signal,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(0, networkErrorCode, 'The API could not be reached.')
  }

  const payload: unknown = await response.json().catch(() => undefined)
  if (authenticated && response.status === 401) throw unauthorized(payload)
  if (!response.ok) throw toApiError(response.status, payload)
  return payload as T
}

function unauthorized(payload?: unknown) {
  authentication?.onUnauthorized()
  return payload === undefined
    ? new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.')
    : toApiError(401, payload)
}

function toApiError(status: number, payload: unknown) {
  const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {}
  return new ApiError(
    status,
    typeof error.code === 'string' ? error.code : 'HTTP_ERROR',
    typeof error.message === 'string' ? error.message : `Request failed with status ${status}.`,
    Array.isArray(error.details) ? (error.details as ApiErrorDetail[]) : [],
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
