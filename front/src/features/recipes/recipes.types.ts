/** Public wire contract: back/src/modules/recipes/recipes.schemas.ts; generated types await SCRUM-54. */
export interface RecipeSummary {
  id: string
  title: string
  description: string | null
  prepMinutes: number | null
  servings: number
}

export interface RecipeListResponse {
  data: RecipeSummary[]
  pagination: { page: number; pageSize: number; total: number }
}

export interface RecipeDetails extends RecipeSummary {
  ingredients: { ingredientId: string; name: string; quantity: number; unit: import('../../shared/lib/quantity.ts').MeasureUnit }[]
  steps: { position: number; instruction: string }[]
}
