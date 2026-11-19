import type { MeasureUnit, ShoppingListItem } from './shopping-lists.types.ts'

const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

// [singular, plural]; metric units stay abbreviated.
const unitLabels: Record<MeasureUnit, [string, string]> = {
  g: ['g', 'g'], kg: ['kg', 'kg'], ml: ['ml', 'ml'], cl: ['cl', 'cl'], l: ['l', 'l'],
  piece: ['pièce', 'pièces'], bunch: ['botte', 'bottes'], pinch: ['pincée', 'pincées'],
  tbsp: ['c. à soupe', 'c. à soupe'], tsp: ['c. à café', 'c. à café'],
}

/** "600 g", "2 pièces", "1,5 c. à soupe", or an empty string for an item without quantity. */
export function formatQuantity({ quantity, unit }: Pick<ShoppingListItem, 'quantity' | 'unit'>) {
  if (quantity === null) return ''
  if (!unit) return number.format(quantity)
  const [singular, plural] = unitLabels[unit]
  return `${number.format(quantity)} ${quantity > 1 ? plural : singular}`
}

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
