import { readFile } from 'node:fs/promises'
import { pool } from '../src/db/pool.ts'

// Charge data/ciqual-nutrients.csv et data/ciqual.csv dans le catalogue. Peut être relancé :
// les aliments sont mis à jour d'après leur code Ciqual et leurs valeurs nutritionnelles remplacées.
// Les ingrédients ajoutés à la main et les poids à la pièce restent intacts.

async function readCsv(file: string) {
  const csv = await readFile(new URL(`../data/${file}`, import.meta.url), 'utf8')
  const [header, ...rows] = csv.trim().split('\n').map(parseCsvLine)
  return { header, rows }
}

function parseCsvLine(line: string) {
  return Array.from(line.matchAll(/"((?:[^"]|"")*)"/g), ([, value]) => value.replace(/""/g, '"'))
}

// « 22.1 » → exact ; « <0.5 » → less_than ; « traces » → 0. Vide (inconnu) → null.
function parseAmount(value: string) {
  if (value === '') return null
  if (value === 'traces') return { amount: '0', qualifier: 'traces' }
  if (value.startsWith('<')) return { amount: value.slice(1), qualifier: 'less_than' }
  return { amount: value, qualifier: 'exact' }
}

async function importCiqual() {
  const nutrients = await readCsv('ciqual-nutrients.csv')
  const foods = await readCsv('ciqual.csv')
  const nutrientCodes = foods.header.slice(3)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `INSERT INTO nutrients (code, name, unit)
       SELECT * FROM unnest($1::integer[], $2::text[], $3::text[])
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, unit = EXCLUDED.unit`,
      [0, 1, 2].map((column) => nutrients.rows.map((row) => row[column])),
    )

    const { rows: ingredients } = await client.query<{ id: string; ciqual_code: number }>(
      `INSERT INTO ingredients (ciqual_code, name, category)
       SELECT code, name, nullif(category, '')
       FROM unnest($1::integer[], $2::text[], $3::text[]) AS source (code, name, category)
       ON CONFLICT (ciqual_code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
       RETURNING id, ciqual_code`,
      [0, 1, 2].map((column) => foods.rows.map((row) => row[column])),
    )
    const ingredientIds = new Map(ingredients.map((row) => [String(row.ciqual_code), row.id]))

    const values = { ingredientIds: [] as string[], codes: [] as string[], amounts: [] as string[], qualifiers: [] as string[] }
    for (const row of foods.rows) {
      const ingredientId = ingredientIds.get(row[0])!
      nutrientCodes.forEach((code, index) => {
        const parsed = parseAmount(row[index + 3])
        if (!parsed) return
        values.ingredientIds.push(ingredientId)
        values.codes.push(code)
        values.amounts.push(parsed.amount)
        values.qualifiers.push(parsed.qualifier)
      })
    }

    await client.query('DELETE FROM ingredient_nutrients WHERE ingredient_id = ANY($1::uuid[])', [
      ingredients.map((row) => row.id),
    ])
    await client.query(
      `INSERT INTO ingredient_nutrients (ingredient_id, nutrient_code, amount, qualifier)
       SELECT * FROM unnest($1::uuid[], $2::integer[], $3::numeric[], $4::nutrient_qualifier[])`,
      [values.ingredientIds, values.codes, values.amounts, values.qualifiers],
    )

    await client.query('COMMIT')
    console.log(
      `Catalogue Ciqual importé : ${ingredients.length} aliments, ${nutrients.rows.length} nutriments, ` +
        `${values.amounts.length} valeurs.`,
    )
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

importCiqual().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
