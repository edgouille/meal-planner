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
