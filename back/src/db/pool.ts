import pg from 'pg'

// Charge back/.env s'il existe ; en production, les variables viennent de l'environnement.
try {
  process.loadEnvFile()
} catch {
  // Pas de fichier .env : on garde les variables déjà définies.
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL est manquante. Copiez back/.env.example en back/.env.')
}

export const pool = new pg.Pool({ connectionString })
