import type { RequestHandler, Response } from 'express'
import { validatedRequest } from '../../shared/http/validate-request.ts'
import { shoppingListsContract } from './shopping-lists.contract.ts'
import { optionalShoppingListResponseSchema, shoppingListItemResponseSchema, shoppingListResponseSchema } from './shopping-lists.schemas.ts'
import type { ShoppingListService } from './shopping-lists.service.ts'

function authenticatedUser(res: Response): string {
  const userId: unknown = res.locals.auth?.userId
  if (typeof userId !== 'string') throw new Error('Authentication middleware is missing.')
  return userId
}
export function createShoppingListController(service: ShoppingListService) {
  const current: RequestHandler = async (_req, res) => {
    const { query } = validatedRequest(shoppingListsContract.current.request, res)
    const data = await service.current(authenticatedUser(res), query)
    res.set('Cache-Control', 'no-store').json(optionalShoppingListResponseSchema.parse({ data }))
  }
  const generate: RequestHandler = async (_req, res) => {
    const { body } = validatedRequest(shoppingListsContract.generate.request, res)
    const data = await service.generate(authenticatedUser(res), body)
    res.set('Cache-Control', 'no-store').status(201).json(shoppingListResponseSchema.parse({ data }))
  }
  const updateItem: RequestHandler = async (_req, res) => {
    const { params, body } = validatedRequest(shoppingListsContract.updateItem.request, res)
    const data = await service.updateItem(authenticatedUser(res), params, body)
    res.set('Cache-Control', 'no-store').json(shoppingListItemResponseSchema.parse({ data }))
  }
  return { current, generate, updateItem }
}
