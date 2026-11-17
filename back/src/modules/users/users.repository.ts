import type { Pool } from 'pg'
import { toUser, type UserRow } from './users.model.ts'

export function createUserRepository(pool: Pick<Pool, 'query'>) {
  return {
    async createAccount(email: string, displayName: string, passwordHash: string) {
      const { rows: [row] } = await pool.query<UserRow>(
        `INSERT INTO users (email, display_name, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (lower(email)) DO NOTHING
         RETURNING id, email, display_name, created_at`,
        [email, displayName, passwordHash],
      )
      return row ? toUser(row) : null
    },

    async findAccountByEmail(email: string) {
      const { rows: [row] } = await pool.query<UserRow & { password_hash: string }>(
        `SELECT id, email, display_name, created_at, password_hash
         FROM users WHERE lower(email) = lower($1)`,
        [email],
      )
      return row ? { user: toUser(row), passwordHash: row.password_hash } : null
    },
  }
}

export type UserRepository = ReturnType<typeof createUserRepository>
