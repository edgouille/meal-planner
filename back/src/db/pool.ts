import pg from 'pg'
import { loadEnvironmentFile, requireDatabaseUrl } from '../config/env.ts'

// CLI database scripts and the HTTP server share the same configuration and pool.
loadEnvironmentFile()
export const pool = new pg.Pool({ connectionString: requireDatabaseUrl(process.env.DATABASE_URL) })

// An idle connection failure must not become an unhandled EventEmitter error.
pool.on('error', () => console.error('An idle PostgreSQL connection failed.'))
