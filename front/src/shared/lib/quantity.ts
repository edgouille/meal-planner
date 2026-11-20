export type MeasureUnit = 'g' | 'kg' | 'ml' | 'cl' | 'l' | 'piece' | 'tbsp' | 'tsp' | 'bunch' | 'pinch'

const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

// [singular, plural]; metric units stay abbreviated.
const unitLabels: Record<MeasureUnit, [string, string]> = {
  g: ['g', 'g'], kg: ['kg', 'kg'], ml: ['ml', 'ml'], cl: ['cl', 'cl'], l: ['l', 'l'],
  piece: ['pièce', 'pièces'], bunch: ['botte', 'bottes'], pinch: ['pincée', 'pincées'],
  tbsp: ['c. à soupe', 'c. à soupe'], tsp: ['c. à café', 'c. à café'],
}

/** "600 g", "2 pièces", "1,5 c. à soupe", or an empty string for an item without quantity. */
export function formatQuantity({ quantity, unit }: { quantity: number | null; unit: MeasureUnit | null }) {
  if (quantity === null) return ''
  if (!unit) return number.format(quantity)
  const [singular, plural] = unitLabels[unit]
  return `${number.format(quantity)} ${quantity > 1 ? plural : singular}`
}

