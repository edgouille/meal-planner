import { pool } from '../src/db/pool.ts'

// Supprime toutes les tables et tous les types. Réservé au développement local.
async function reset() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:reset est interdit en production.')
  }
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  console.log('Base vidée.')
}

reset()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
