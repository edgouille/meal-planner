// Error shape returned by the API: { error: { code, message, details } } (see ARCHI.md).
export interface ApiErrorDetail {
  field: string
  code: string
  message: string
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Status 0 means the request never reached the API (offline, server stopped, CORS).
export const networkErrorCode = 'NETWORK_ERROR'
