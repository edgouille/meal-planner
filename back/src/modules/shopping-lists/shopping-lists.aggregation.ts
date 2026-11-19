// Turns the ingredient lines of planned meals into shopping list items (SCRUM-29).
// Lines are grouped by ingredient and compatible unit: grams and kilograms add up, as do
// millilitres, centilitres and litres. Pieces, bunches, spoons and pinches are only added to the
// same unit, because converting them would change what the user actually buys.

export const measureUnits = ['g', 'kg', 'ml', 'cl', 'l', 'piece', 'tbsp', 'tsp', 'bunch', 'pinch'] as const
export type MeasureUnit = (typeof measureUnits)[number]

/** One ingredient line of a planned meal. */
export interface PlannedIngredient {
  ingredientId: string
  name: string
  quantity: number
  unit: MeasureUnit
  /** Servings the recipe quantities are written for. */
  recipeServings: number
  /** Servings planned for the meal. */
  plannedServings: number
}

export interface AggregatedItem {
  ingredientId: string
  label: string
  quantity: number
  unit: MeasureUnit
}

type UnitFamily = 'mass' | 'volume' | MeasureUnit

// Factor to the family's base unit: grams for mass, millilitres for volume.
const baseFactors: Partial<Record<MeasureUnit, number>> = { g: 1, kg: 1000, ml: 1, cl: 10, l: 1000 }

export function unitFamily(unit: MeasureUnit): UnitFamily {
  if (unit === 'g' || unit === 'kg') return 'mass'
  if (unit === 'ml' || unit === 'cl' || unit === 'l') return 'volume'
  return unit
}

/** Quantity in the base unit of its family (grams, millilitres, or the unit itself). */
export function toBaseQuantity(quantity: number, unit: MeasureUnit) {
  return quantity * (baseFactors[unit] ?? 1)
}

/** Identifies items that can be compared, for example when a list is generated again. */
export function itemKey(ingredientId: string, unit: MeasureUnit) {
  return `${ingredientId}:${unitFamily(unit)}`
}

const round = (value: number) => Math.round(value * 100) / 100

// Chooses a readable unit: 1 500 g becomes 1.5 kg, 750 ml becomes 75 cl.
function display(family: UnitFamily, base: number): { quantity: number; unit: MeasureUnit } {
  if (family === 'mass') return base >= 1000 ? { quantity: round(base / 1000), unit: 'kg' } : { quantity: round(base), unit: 'g' }
  if (family === 'volume') {
    if (base >= 1000) return { quantity: round(base / 1000), unit: 'l' }
    if (base >= 100) return { quantity: round(base / 10), unit: 'cl' }
    return { quantity: round(base), unit: 'ml' }
  }
  // Pieces and bunches are bought whole.
  if (family === 'piece' || family === 'bunch') return { quantity: Math.ceil(round(base)), unit: family }
  return { quantity: round(base), unit: family }
}

export function aggregateIngredients(lines: PlannedIngredient[]): AggregatedItem[] {
  const groups = new Map<string, { ingredientId: string; label: string; family: UnitFamily; base: number }>()
  for (const line of lines) {
    const scaled = (line.quantity * line.plannedServings) / line.recipeServings
    const key = itemKey(line.ingredientId, line.unit)
    const group = groups.get(key)
    if (group) group.base += toBaseQuantity(scaled, line.unit)
    else groups.set(key, { ingredientId: line.ingredientId, label: line.name, family: unitFamily(line.unit), base: toBaseQuantity(scaled, line.unit) })
  }
  return [...groups.values()]
    .map(({ ingredientId, label, family, base }) => ({ ingredientId, label, ...display(family, base) }))
    .filter(item => item.quantity > 0)
    .sort((first, second) => first.label.localeCompare(second.label, 'fr') || first.unit.localeCompare(second.unit))
}

/** An item of the list being replaced. */
export interface PreviousItem {
  ingredientId: string | null
  label: string
  quantity: number | null
  unit: MeasureUnit | null
  isPurchased: boolean
  isManual: boolean
}

export type GeneratedItem = PreviousItem

// When a period is generated again, an item stays purchased if the user already bought at least
// the new quantity. Items added by hand are kept as they are.
export function mergeWithPrevious(items: AggregatedItem[], previous: PreviousItem[]): GeneratedItem[] {
  const bought = new Map<string, number>()
  for (const item of previous) {
    if (!item.isPurchased || item.isManual || !item.ingredientId || !item.unit || item.quantity === null) continue
    const key = itemKey(item.ingredientId, item.unit)
    bought.set(key, (bought.get(key) ?? 0) + toBaseQuantity(item.quantity, item.unit))
  }
  return [
    ...items.map(item => {
      const purchased = bought.get(itemKey(item.ingredientId, item.unit))
      return { ...item, isPurchased: purchased !== undefined && toBaseQuantity(item.quantity, item.unit) <= purchased + 1e-9, isManual: false }
    }),
    ...previous.filter(item => item.isManual),
  ]
}
