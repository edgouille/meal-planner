import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Server } from 'node:http'
import { createApp } from './app.ts'
import { loadRuntimeConfig, type RuntimeConfig } from './config/env.ts'
import type { ApiModule } from './shared/http/api-module.ts'
import { createHealthModule } from './modules/health/index.ts'

interface ServerOptions {
  config: RuntimeConfig
  modules?: ApiModule[]
  closeDatabase: () => Promise<void>
}

export async function startServer({ config, modules, closeDatabase }: ServerOptions) {
  const app = createApp({ modules, frontendOrigin: config.frontendOrigin })
  let server: Server
  try {
    server = await new Promise<Server>((resolveListening, reject) => {
      const listening = app.listen(config.port, config.host)
      listening.once('error', reject)
      listening.once('listening', () => {
        listening.off('error', reject)
        resolveListening(listening)
      })
    })
  } catch (error) {
    await closeDatabase()
    throw error
  }

  let closing: Promise<void> | undefined
  function close(): Promise<void> {
    if (closing) return closing
    process.off('SIGINT', handleSignal)
    process.off('SIGTERM', handleSignal)
    closing = (async () => {
      let timeout: NodeJS.Timeout | undefined
      try {
        await Promise.race([
          (async () => {
            await new Promise<void>((resolveClosed, reject) => {
              server.close(error => error ? reject(error) : resolveClosed())
            })
            await closeDatabase()
          })(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              server.closeAllConnections()
              reject(new Error('Graceful shutdown timed out.'))
            }, config.shutdownTimeoutMs)
          }),
        ])
      } finally {
        clearTimeout(timeout)
      }
    })()
    return closing
  }

  function handleSignal() {
    void close().catch(() => {
      console.error('Graceful shutdown failed.')
      process.exit(1)
    })
  }
  process.once('SIGINT', handleSignal)
  process.once('SIGTERM', handleSignal)
  return { server, close }
}

async function main() {
  const config = loadRuntimeConfig()
  // Validate runtime configuration before importing the database module.
  const { pool } = await import('./db/pool.ts')
  const health = createHealthModule({ pool, readinessTimeoutMs: config.readinessTimeoutMs })
  const runtime = await startServer({ config, modules: [health], closeDatabase: () => pool.end() })
  const address = runtime.server.address()
  const port = typeof address === 'object' && address ? address.port : config.port
  console.info(`MealPlanner API listening on http://${config.host}:${port}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch(() => {
    console.error('Could not start the API. Check the runtime configuration and listening port.')
    process.exitCode = 1
  })
}
