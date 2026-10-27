import type { RequestHandler, Response } from 'express'
import { z } from 'zod'
import { ApiError } from './errors.ts'

type RequestSchemas = Partial<Record<'body' | 'params' | 'query', z.ZodType>>
type ValidatedRequest<S extends RequestSchemas> = { [K in keyof S]: S[K] extends z.ZodType ? z.output<S[K]> : never }

export function validateRequest<S extends RequestSchemas>(schemas: S): RequestHandler {
  return async (req, res, next) => {
    const validated: Record<string, unknown> = {}
    const details = []
    for (const part of ['body', 'params', 'query'] as const) {
      const schema = schemas[part]
      if (!schema) continue
      const result = await schema.safeParseAsync(req[part])
      if (result.success) {
        validated[part] = result.data
      } else {
        details.push(...result.error.issues.map(issue => ({
          field: [part, ...issue.path.map(String)].join('.'),
          code: issue.code,
          // Schema messages can contain submitted values; do not echo them.
          message: 'Invalid value.',
        })))
      }
    }
    if (details.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', details)
    // Express 5 exposes req.query as a getter. Keep parsed values separate from raw input.
    res.locals.validated = validated
    next()
  }
}

/** Use the same schema object supplied to validateRequest on this route. */
export function validatedRequest<S extends RequestSchemas>(_schemas: S, res: Response): ValidatedRequest<S> {
  if (!res.locals.validated) throw new Error('Request validation middleware is missing.')
  return res.locals.validated as ValidatedRequest<S>
}
