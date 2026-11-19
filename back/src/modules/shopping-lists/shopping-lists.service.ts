import { aggregateIngredients, mergeWithPrevious } from './shopping-lists.aggregation.ts'
import type { ShoppingListRepository } from './shopping-lists.repository.ts'
import type { Period } from './shopping-lists.schemas.ts'

export function createShoppingListService(lists: ShoppingListRepository) {
  return {
    current: (userId: string, period: Period) => lists.findForPeriod(userId, period),
    async generate(userId: string, period: Period) {
      const items = aggregateIngredients(await lists.listPlannedIngredients(userId, period))
      return lists.replaceForPeriod(userId, period, previous => mergeWithPrevious(items, previous))
    },
  }
}
export type ShoppingListService = ReturnType<typeof createShoppingListService>
