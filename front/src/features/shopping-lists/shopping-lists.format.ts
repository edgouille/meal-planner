import type { ShoppingListItem } from './shopping-lists.types.ts'

export { formatQuantity } from '../../shared/lib/quantity.ts'

export interface ItemGroup {
  title: string
  items: ShoppingListItem[]
}

/** Groups items by aisle, keeping the API order (aisle, then name; manual items last). */
export function groupByAisle(items: ShoppingListItem[]): ItemGroup[] {
  const groups: ItemGroup[] = []
  for (const item of items) {
    const title = item.isManual ? 'Ajouts personnels' : item.category ?? 'Autres produits'
    const group = groups.at(-1)?.title === title ? groups.at(-1) : undefined
    if (group) group.items.push(item)
    else groups.push({ title, items: [item] })
  }
  return groups
}
