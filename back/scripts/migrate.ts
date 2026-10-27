import { readdir, readFile } from 'node:fs/promises'
import { pool } from '../src/db/pool.ts'

const migrationsDir = new URL('../migrations/', import.meta.url)

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text        PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations')
    const applied = new Set(rows.map((row) => row.name))

    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()
    const pending = files.filter((file) => !applied.has(file))

    if (pending.length === 0) {
      console.log('Base à jour, aucune migration à appliquer.')
      return
    }

    for (const file of pending) {
      const sql = await readFile(new URL(file, migrationsDir), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`Migration appliquée : ${file}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`Échec de la migration ${file}`, { cause: error })
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
