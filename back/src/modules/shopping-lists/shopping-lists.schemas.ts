import { z } from 'zod'
import { measureUnits } from './shopping-lists.aggregation.ts'

const date = z.iso.date().refine(value => value >= '0100-01-01' && value <= '9998-12-31')

// A period of at most 31 days, as for the meal plan it is generated from.
export const periodSchema = z.strictObject({ startDate: date, endDate: date }).refine(
  ({ startDate, endDate }) => endDate >= startDate && Date.parse(endDate) - Date.parse(startDate) <= 30 * 86400000,
  { path: ['endDate'], message: 'Use an ordered date range of at most 31 days.' },
)

export const shoppingListItemSchema = z.object({
  id: z.uuid(),
  ingredientId: z.uuid().nullable(),
  label: z.string(),
  /** Ciqual subgroup used to sort the list by aisle; null for manual items. */
  category: z.string().nullable(),
  quantity: z.number().positive().nullable(),
  unit: z.enum(measureUnits).nullable(),
  isPurchased: z.boolean(),
  isManual: z.boolean(),
})

export const shoppingListSchema = z.object({
  id: z.uuid(),
  startDate: date,
  endDate: date,
  generatedAt: z.iso.datetime({ offset: true }),
  items: z.array(shoppingListItemSchema),
})

export const shoppingListResponseSchema = z.object({ data: shoppingListSchema })
export const optionalShoppingListResponseSchema = z.object({ data: shoppingListSchema.nullable() })

export type Period = z.output<typeof periodSchema>
export type ShoppingList = z.output<typeof shoppingListSchema>
export type ShoppingListItem = z.output<typeof shoppingListItemSchema>
