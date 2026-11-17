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

    async findById(id: string) {
      const { rows: [row] } = await pool.query<UserRow>(
        `SELECT id, email, display_name, created_at
         FROM users WHERE id = $1`,
        [id],
      )
      return row ? toUser(row) : null
    },

    /** Returns the row as written, or null when no account has this ID. */
    async updateDisplayName(id: string, displayName: string) {
      const { rows: [row] } = await pool.query<UserRow>(
        `UPDATE users SET display_name = $2
         WHERE id = $1
         RETURNING id, email, display_name, created_at`,
        [id, displayName],
      )
      return row ? toUser(row) : null
    },
  }
}

export type UserRepository = ReturnType<typeof createUserRepository>
