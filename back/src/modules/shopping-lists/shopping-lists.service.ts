import { ApiError } from '../../shared/http/errors.ts'
import { aggregateIngredients, mergeWithPrevious } from './shopping-lists.aggregation.ts'
import type { ShoppingListRepository } from './shopping-lists.repository.ts'
import type { ItemParams, Period, UpdateItem } from './shopping-lists.schemas.ts'

export function createShoppingListService(lists: ShoppingListRepository) {
  return {
    current: (userId: string, period: Period) => lists.findForPeriod(userId, period),
    async generate(userId: string, period: Period) {
      const items = aggregateIngredients(await lists.listPlannedIngredients(userId, period))
      return lists.replaceForPeriod(userId, period, previous => mergeWithPrevious(items, previous))
    },
    async updateItem(userId: string, params: ItemParams, changes: UpdateItem) {
      const item = await lists.updateItemForUser(userId, params, changes)
      if (!item) throw new ApiError(404, 'ITEM_NOT_FOUND', 'Shopping list item not found.')
      return item
    },
  }
}
export type ShoppingListService = ReturnType<typeof createShoppingListService>
