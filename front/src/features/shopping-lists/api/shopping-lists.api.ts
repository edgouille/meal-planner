import { apiRequest } from '../../../shared/api/client.ts'
import type { ShoppingList } from '../shopping-lists.types.ts'

export function getShoppingList(startDate: string, endDate: string, signal: AbortSignal) {
  const query = new URLSearchParams({ startDate, endDate })
  return apiRequest<{ data: ShoppingList | null }>(`/api/shopping-lists?${query}`, { authenticated: true, signal })
}

export function generateShoppingList(startDate: string, endDate: string) {
  return apiRequest<{ data: ShoppingList }>('/api/shopping-lists/generate', {
    method: 'POST', body: { startDate, endDate }, authenticated: true,
  })
}
