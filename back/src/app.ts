import express from 'express'
import type { ApiModule } from './shared/http/api-module.ts'

export interface AppOptions {
  modules?: ApiModule[]
}

export function createApp({ modules = [] }: AppOptions = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  for (const module of modules) app.use(module.basePath, module.router)

  return app
}
