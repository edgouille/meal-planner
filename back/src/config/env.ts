import { loadEnvFile } from 'node:process'

let fileLoaded = false

export function loadEnvironmentFile() {
  if (fileLoaded) return
  try {
    loadEnvFile()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  fileLoaded = true
}

export function requireDatabaseUrl(value: string | undefined): string {
  try {
    const url = new URL(value ?? '')
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
      throw new Error()
    }
    return url.toString()
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL URL with a host and database name.')
  }
}

function positiveInteger(value: string | undefined, fallback: number, name: string, max = 2_147_483_647) {
  if (value === undefined) return fallback
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) {
    throw new Error(`${name} must be an integer between 1 and ${max}.`)
  }
  return Number(value)
}

export function readEnvironment(source: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = source.NODE_ENV ?? 'development'
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production.')
  }
  const host = source.HOST ?? '127.0.0.1'
  if (!host.trim() || /[\s/]/.test(host)) throw new Error('HOST must be a host name or IP address.')

  let frontendOrigin: string
  try {
    const url = new URL(source.FRONTEND_ORIGIN ?? 'http://localhost:5173')
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) throw new Error()
    frontendOrigin = url.origin
  } catch {
    throw new Error('FRONTEND_ORIGIN must be an HTTP(S) origin without a path or credentials.')
  }

  return {
    nodeEnv,
    host,
    port: positiveInteger(source.PORT, 3000, 'PORT', 65535),
    databaseUrl: requireDatabaseUrl(source.DATABASE_URL),
    frontendOrigin,
    shutdownTimeoutMs: positiveInteger(source.SHUTDOWN_TIMEOUT_MS, 10_000, 'SHUTDOWN_TIMEOUT_MS'),
  }
}

export type RuntimeConfig = ReturnType<typeof readEnvironment>

export function loadRuntimeConfig(): RuntimeConfig {
  loadEnvironmentFile()
  return readEnvironment()
}
