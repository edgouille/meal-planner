import { apiRequest } from '../../../shared/api/client.ts'
import type { RecipeDetails, RecipeListResponse } from '../recipes.types.ts'

export function listRecipes({ page, q }: { page: number; q: string }, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (q) query.set('q', q)
  return apiRequest<RecipeListResponse>(`/api/recipes?${query}`, { authenticated: true, signal })
}

export function getRecipe(id: string, signal?: AbortSignal) {
  return apiRequest<{ data: RecipeDetails }>(`/api/recipes/${encodeURIComponent(id)}`, { authenticated: true, signal })
}
