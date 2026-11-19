// Mirrors back/src/modules/shopping-lists/shopping-lists.schemas.ts until API types are generated
// from OpenAPI (ARCHI.md).

export type MeasureUnit = 'g' | 'kg' | 'ml' | 'cl' | 'l' | 'piece' | 'tbsp' | 'tsp' | 'bunch' | 'pinch'

export interface ShoppingListItem {
  id: string
  ingredientId: string | null
  label: string
  /** Ciqual subgroup (aisle); null for manual items. */
  category: string | null
  quantity: number | null
  unit: MeasureUnit | null
  isPurchased: boolean
  isManual: boolean
}

export interface ShoppingList {
  id: string
  startDate: string
  endDate: string
  generatedAt: string
  items: ShoppingListItem[]
}
