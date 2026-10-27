import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

export interface RequestLog {
  event: 'request_completed' | 'request_error'
  requestId: string
  method?: string
  statusCode?: number
  durationMs?: number
}

export type RequestLogger = (entry: RequestLog) => void
export const consoleRequestLogger: RequestLogger = entry => console.info(JSON.stringify(entry))

export function requestLogging(logger: RequestLogger): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID()
    const started = performance.now()
    res.locals.requestId = requestId
    res.setHeader('X-Request-Id', requestId)
    res.once('finish', () => logger({
      event: 'request_completed', requestId, method: req.method,
      statusCode: res.statusCode, durationMs: Math.round(performance.now() - started),
    }))
    next()
  }
}
