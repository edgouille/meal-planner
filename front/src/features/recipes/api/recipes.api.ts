import { apiRequest } from '../../../shared/api/client.ts'
import type { RecipeListResponse } from '../recipes.types.ts'

export function listRecipes(page: number, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), pageSize: '20' })
  return apiRequest<RecipeListResponse>(`/api/recipes?${query}`, { authenticated: true, signal })
}
