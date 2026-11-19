import { errorResponseSchema } from '../../shared/http/errors.ts'
import {
  itemParams, optionalShoppingListResponseSchema, periodSchema, shoppingListItemResponseSchema, shoppingListResponseSchema, updateItemBody,
} from './shopping-lists.schemas.ts'

export const shoppingListsBasePath = '/api/shopping-lists'
const errors = {
  400: { description: 'Invalid input.', schema: errorResponseSchema },
  401: { description: 'Authentication required.', schema: errorResponseSchema },
  500: { description: 'Unexpected failure.', schema: errorResponseSchema },
}
export const shoppingListsContract = {
  current: {
    method: 'get', path: '/', operationId: 'getShoppingList', tags: ['Shopping lists'], security: [{ bearerAuth: [] }],
    description: 'Return the owned list last generated for exactly this period, or null when none exists.',
    request: { query: periodSchema },
    responses: { ...errors, 200: { description: 'Owned list for the period, items sorted by aisle and name.', schema: optionalShoppingListResponseSchema } },
  },
  generate: {
    method: 'post', path: '/generate', operationId: 'generateShoppingList', tags: ['Shopping lists'], security: [{ bearerAuth: [] }],
    description: 'Build the list from the meals planned in the period, replacing the previous list of the same period. '
      + 'Purchased items stay purchased when their quantity does not increase; manual items are kept.',
    request: { body: periodSchema },
    responses: { ...errors, 201: { description: 'List generated. It is empty when no meal is planned.', schema: shoppingListResponseSchema } },
  },
  updateItem: {
    method: 'patch', path: '/:listId/items/:itemId', operationId: 'updateShoppingListItem', tags: ['Shopping lists'], security: [{ bearerAuth: [] }],
    description: 'Mark an item of an owned list as purchased or not purchased.',
    request: { params: itemParams, body: updateItemBody },
    responses: { ...errors, 200: { description: 'Item updated.', schema: shoppingListItemResponseSchema },
      404: { description: 'Item not found in an owned list.', schema: errorResponseSchema } },
  },
} as const
