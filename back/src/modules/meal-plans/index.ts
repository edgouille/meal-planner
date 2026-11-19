import { Router, type RequestHandler } from 'express'
import type { ApiModule } from '../../shared/http/api-module.ts'
import { validateRequest } from '../../shared/http/validate-request.ts'
import { mealPlansBasePath, mealPlansContract } from './meal-plans.contract.ts'
import { createMealPlanController } from './meal-plans.controller.ts'
import type { MealPlanRepository } from './meal-plans.repository.ts'
import { createMealPlanService } from './meal-plans.service.ts'

export { createMealPlanRepository, type MealPlanRepository } from './meal-plans.repository.ts'
export { mealPlansContract } from './meal-plans.contract.ts'
export type { MealPlan } from './meal-plans.schemas.ts'

export function createMealPlansModule(repository: MealPlanRepository, authenticate: RequestHandler): ApiModule {
  const router = Router()
  router.use(authenticate)
  const controller = createMealPlanController(createMealPlanService(repository))
  const { list, create, remove } = mealPlansContract
  router[list.method](list.path, validateRequest(list.request), controller.list)
  router[create.method](create.path, validateRequest(create.request), controller.create)
  router[remove.method](remove.path, validateRequest(remove.request), controller.remove)
  return { basePath: mealPlansBasePath, router }
}
