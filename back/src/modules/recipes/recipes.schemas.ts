import { z } from 'zod'

export const recipeListQuery = z.strictObject({
  q: z.string().trim().max(150).refine(value => !value.includes('\0')).default(''),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const recipeSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  prepMinutes: z.number().int().nonnegative().nullable(),
  servings: z.number().int().positive(),
})

export const recipeListResponseSchema = z.object({
  data: z.array(recipeSummarySchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive().max(100),
    total: z.number().int().nonnegative(),
  }),
})

export type RecipeListQuery = z.output<typeof recipeListQuery>
export type RecipeSummary = z.output<typeof recipeSummarySchema>
export type RecipeListResponse = z.output<typeof recipeListResponseSchema>
