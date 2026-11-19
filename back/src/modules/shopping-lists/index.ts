import { Router, type RequestHandler } from 'express'
import type { ApiModule } from '../../shared/http/api-module.ts'
import { validateRequest } from '../../shared/http/validate-request.ts'
import { createShoppingListController } from './shopping-lists.controller.ts'
import { shoppingListsBasePath, shoppingListsContract } from './shopping-lists.contract.ts'
import type { ShoppingListRepository } from './shopping-lists.repository.ts'
import { createShoppingListService } from './shopping-lists.service.ts'

export { createShoppingListRepository, type ShoppingListRepository } from './shopping-lists.repository.ts'
export { shoppingListsContract } from './shopping-lists.contract.ts'
export type { ShoppingList, ShoppingListItem } from './shopping-lists.schemas.ts'

export function createShoppingListsModule(repository: ShoppingListRepository, authenticate: RequestHandler): ApiModule {
  const router = Router()
  router.use(authenticate)
  const controller = createShoppingListController(createShoppingListService(repository))
  const { current, generate, updateItem } = shoppingListsContract
  router[current.method](current.path, validateRequest(current.request), controller.current)
  router[generate.method](generate.path, validateRequest(generate.request), controller.generate)
  router[updateItem.method](updateItem.path, validateRequest(updateItem.request), controller.updateItem)
  return { basePath: shoppingListsBasePath, router }
}
