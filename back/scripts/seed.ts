import { randomBytes, scryptSync } from 'node:crypto'
import type { PoolClient } from 'pg'
import { pool } from '../src/db/pool.ts'

// Données fictives pour le développement local. Le compte de démo est recréé à chaque exécution.
const demoUser = {
  email: 'demo@mealplanner.local',
  password: 'mealplanner-demo',
  displayName: 'Compte démo',
}

// kcal pour 100 g ou 100 ml (valeurs moyennes indicatives), poids d'une pièce ou d'une botte en grammes.
const ingredients: Array<[name: string, category: string, kcalPer100: number, unitWeightG: number | null]> = [
  ['Pois chiches', 'Épicerie', 139, null],
  ['Lait de coco', 'Épicerie', 197, null],
  ['Pâte de curry', 'Épicerie', 110, null],
  ['Quinoa', 'Épicerie', 368, null],
  ['Lentilles vertes', 'Épicerie', 352, null],
  ['Flocons d’avoine', 'Épicerie', 379, null],
  ['Huile d’olive', 'Épicerie', 884, null],
  ['Potimarron', 'Fruits et légumes', 34, 1200],
  ['Oignon', 'Fruits et légumes', 40, 150],
  ['Pomme', 'Fruits et légumes', 52, 180],
  ['Concombre', 'Fruits et légumes', 15, 300],
  ['Coriandre', 'Fruits et légumes', 23, 30],
  ['Feta', 'Crèmerie', 264, null],
  ['Lait', 'Crèmerie', 46, null],
  ['Bouillon de légumes', 'Épicerie', 7, null],
]

type Recipe = {
  title: string
  description: string
  prepMinutes: number
  servings: number
  ingredients: Array<[name: string, quantity: number, unit: string]>
  steps: string[]
}

const recipes: Recipe[] = [
  {
    title: 'Curry de pois chiches',
    description: 'Un curry doux au lait de coco, prêt en 35 minutes.',
    prepMinutes: 35,
    servings: 4,
    ingredients: [
      ['Pois chiches', 400, 'g'],
      ['Lait de coco', 400, 'ml'],
      ['Pâte de curry', 2, 'tbsp'],
      ['Oignon', 1, 'piece'],
      ['Coriandre', 1, 'bunch'],
    ],
    steps: [
      'Émincer l’oignon et le faire revenir 5 minutes.',
      'Ajouter la pâte de curry, puis les pois chiches égouttés.',
      'Verser le lait de coco et laisser mijoter 20 minutes.',
      'Parsemer de coriandre avant de servir.',
    ],
  },
  {
    title: 'Velouté de potimarron',
    description: 'Velouté de saison, sans éplucher le potimarron.',
    prepMinutes: 40,
    servings: 4,
    ingredients: [
      ['Potimarron', 1, 'piece'],
      ['Oignon', 1, 'piece'],
      ['Bouillon de légumes', 75, 'cl'],
      ['Huile d’olive', 1, 'tbsp'],
    ],
    steps: [
      'Couper le potimarron en dés et émincer l’oignon.',
      'Faire revenir l’oignon dans l’huile, ajouter le potimarron.',
      'Couvrir de bouillon et cuire 25 minutes.',
      'Mixer jusqu’à obtenir un velouté lisse.',
    ],
  },
  {
    title: 'Bowl quinoa et feta',
    description: 'Un déjeuner frais à emporter.',
    prepMinutes: 20,
    servings: 2,
    ingredients: [
      ['Quinoa', 150, 'g'],
      ['Feta', 100, 'g'],
      ['Concombre', 1, 'piece'],
      ['Huile d’olive', 2, 'tbsp'],
    ],
    steps: [
      'Cuire le quinoa 12 minutes dans l’eau bouillante.',
      'Couper le concombre et émietter la feta.',
      'Mélanger avec l’huile d’olive.',
    ],
  },
  {
    title: 'Porridge pomme',
    description: 'Petit-déjeuner chaud et rapide.',
    prepMinutes: 10,
    servings: 1,
    ingredients: [
      ['Flocons d’avoine', 50, 'g'],
      ['Lait', 20, 'cl'],
      ['Pomme', 1, 'piece'],
    ],
    steps: [
      'Chauffer le lait avec les flocons 5 minutes.',
      'Ajouter la pomme coupée en dés.',
    ],
  },
]

// Planning de la semaine en cours : [jour (0 = lundi), moment, recette, portions].
const plannedMeals: Array<[dayOffset: number, moment: string, title: string, servings: number]> = [
  [0, 'breakfast', 'Porridge pomme', 1],
  [0, 'lunch', 'Bowl quinoa et feta', 2],
  [0, 'dinner', 'Velouté de potimarron', 2],
  [1, 'lunch', 'Curry de pois chiches', 2],
  [2, 'dinner', 'Curry de pois chiches', 2],
  [3, 'breakfast', 'Porridge pomme', 1],
  [4, 'dinner', 'Velouté de potimarron', 4],
]

// Format provisoire, à remplacer par celui choisi pour l'authentification.
function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

function currentMonday() {
  const date = new Date()
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day)
  return date
}

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

async function seedIngredients(client: PoolClient) {
  for (const [name, category, kcalPer100, unitWeightG] of ingredients) {
    await client.query(
      `INSERT INTO ingredients (name, category, kcal_per_100, unit_weight_g) VALUES ($1, $2, $3, $4)
       ON CONFLICT ((lower(name))) DO UPDATE
       SET category = EXCLUDED.category, kcal_per_100 = EXCLUDED.kcal_per_100, unit_weight_g = EXCLUDED.unit_weight_g`,
      [name, category, kcalPer100, unitWeightG],
    )
  }
  const { rows } = await client.query<{ id: string; name: string }>('SELECT id, name FROM ingredients')
  return new Map(rows.map((row) => [row.name, row.id]))
}

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const ingredientIds = await seedIngredients(client)

    await client.query('DELETE FROM users WHERE lower(email) = lower($1)', [demoUser.email])
    const { rows: [user] } = await client.query<{ id: string }>(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id',
      [demoUser.email, hashPassword(demoUser.password), demoUser.displayName],
    )

    const recipeIds = new Map<string, string>()
    for (const recipe of recipes) {
      const { rows: [created] } = await client.query<{ id: string }>(
        `INSERT INTO recipes (user_id, title, description, prep_minutes, servings)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.id, recipe.title, recipe.description, recipe.prepMinutes, recipe.servings],
      )
      recipeIds.set(recipe.title, created.id)

      for (const [name, quantity, unit] of recipe.ingredients) {
        await client.query(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)',
          [created.id, ingredientIds.get(name), quantity, unit],
        )
      }
      for (const [index, instruction] of recipe.steps.entries()) {
        await client.query(
          'INSERT INTO recipe_steps (recipe_id, position, instruction) VALUES ($1, $2, $3)',
          [created.id, index + 1, instruction],
        )
      }
    }

    const monday = currentMonday()
    for (const [dayOffset, moment, title, servings] of plannedMeals) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + dayOffset)
      await client.query(
        `INSERT INTO planned_meals (user_id, recipe_id, meal_date, moment, servings)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, recipeIds.get(title), toIsoDate(date), moment, servings],
      )
    }

    await client.query('COMMIT')
    console.log(`Données de démo créées : ${demoUser.email} / ${demoUser.password}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
