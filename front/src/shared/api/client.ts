import { ApiError, networkErrorCode, type ApiErrorDetail } from './api-error.ts'

const baseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      signal,
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(0, networkErrorCode, 'The API could not be reached.')
  }

  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok) throw toApiError(response.status, payload)
  return payload as T
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
