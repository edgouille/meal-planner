import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z } from 'zod'
import type { RequestLogger } from '../logging/request-logger.ts'

export const errorDetailSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
})

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(errorDetailSchema),
  }),
})

export type ErrorDetail = z.infer<typeof errorDetailSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>

// Only use public messages and details here; unexpected exceptions are sanitized below.
export class ApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 503,
    readonly code: string,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const notFound: RequestHandler = () => {
  throw new ApiError(404, 'NOT_FOUND', 'The requested resource was not found.')
}

export function errorHandler(logger: RequestLogger): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    if (res.headersSent) return next(error)
    let publicError: ApiError
    if (error instanceof ApiError) {
      publicError = error
    } else if (typeof error === 'object' && error !== null && 'type' in error &&
        error.type === 'entity.parse.failed') {
      publicError = new ApiError(400, 'INVALID_JSON', 'The request body must contain valid JSON.')
    } else if (typeof error === 'object' && error !== null && 'type' in error &&
        error.type === 'entity.too.large') {
      publicError = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body exceeds the allowed size.')
    } else {
      // Never log exception text, SQL, request data, or credentials.
      logger({ event: 'request_error', requestId: res.locals.requestId })
      res.status(500).json({ error: {
        code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', details: [],
      } } satisfies ErrorResponse)
      return
    }
    res.status(publicError.status).json({ error: {
      code: publicError.code, message: publicError.message, details: publicError.details,
    } } satisfies ErrorResponse)
  }
}
