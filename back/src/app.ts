import express from 'express'
import cors from 'cors'
import type { ApiModule } from './shared/http/api-module.ts'
import { errorHandler, notFound } from './shared/http/errors.ts'
import { consoleRequestLogger, requestLogging, type RequestLogger } from './shared/logging/request-logger.ts'

export interface AppOptions {
  modules?: ApiModule[]
  frontendOrigin?: string
  logger?: RequestLogger
}

export function createApp({ modules = [], frontendOrigin = 'http://localhost:5173', logger = consoleRequestLogger }: AppOptions = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(requestLogging(logger))
  app.use(cors({ origin: frontendOrigin }))
  app.use(express.json({ limit: '1mb' }))

  for (const module of modules) app.use(module.basePath, module.router)
  app.use(notFound)
  app.use(errorHandler(logger))

  return app
}
