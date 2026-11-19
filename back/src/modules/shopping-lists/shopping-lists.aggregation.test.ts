import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aggregateIngredients, itemKey, mergeWithPrevious, toBaseQuantity, type PlannedIngredient } from './shopping-lists.aggregation.ts'

const line = (overrides: Partial<PlannedIngredient>): PlannedIngredient => ({
  ingredientId: 'onion', name: 'Oignon', quantity: 1, unit: 'piece', recipeServings: 4, plannedServings: 4, ...overrides,
})

test('adds up the same ingredient across meals and scales quantities to the planned servings', () => {
  const items = aggregateIngredients([
    line({ ingredientId: 'chickpeas', name: 'Pois chiches', quantity: 400, unit: 'g' }),
    line({ ingredientId: 'chickpeas', name: 'Pois chiches', quantity: 400, unit: 'g', plannedServings: 2 }),
  ])
  assert.deepEqual(items, [{ ingredientId: 'chickpeas', label: 'Pois chiches', quantity: 600, unit: 'g' }])
})

test('groups compatible units and chooses a readable unit', () => {
  const items = aggregateIngredients([
    line({ ingredientId: 'flour', name: 'Farine', quantity: 800, unit: 'g' }),
    line({ ingredientId: 'flour', name: 'Farine', quantity: 0.5, unit: 'kg' }),
    line({ ingredientId: 'milk', name: 'Lait', quantity: 20, unit: 'cl' }),
    line({ ingredientId: 'milk', name: 'Lait', quantity: 0.5, unit: 'l' }),
    line({ ingredientId: 'stock', name: 'Bouillon', quantity: 75, unit: 'ml' }),
    line({ ingredientId: 'water', name: 'Eau', quantity: 1, unit: 'l' }),
    line({ ingredientId: 'water', name: 'Eau', quantity: 50, unit: 'cl' }),
  ])
  assert.deepEqual(items.map(({ label, quantity, unit }) => `${label} ${quantity} ${unit}`), [
    'Bouillon 75 ml', 'Eau 1.5 l', 'Farine 1.3 kg', 'Lait 70 cl',
  ])
})

test('keeps incompatible units on separate lines and buys pieces and bunches whole', () => {
  const items = aggregateIngredients([
    line({ quantity: 1, unit: 'piece', plannedServings: 2 }),
    line({ quantity: 100, unit: 'g' }),
    line({ ingredientId: 'coriander', name: 'Coriandre', quantity: 1, unit: 'bunch', plannedServings: 1 }),
    line({ ingredientId: 'curry', name: 'Curry', quantity: 1, unit: 'tbsp', plannedServings: 2 }),
    line({ ingredientId: 'curry', name: 'Curry', quantity: 1, unit: 'tsp' }),
    line({ ingredientId: 'salt', name: 'Sel', quantity: 1, unit: 'pinch', recipeServings: 1, plannedServings: 3 }),
  ])
  assert.deepEqual(items.map(({ label, quantity, unit }) => `${label} ${quantity} ${unit}`), [
    'Coriandre 1 bunch', 'Curry 0.5 tbsp', 'Curry 1 tsp', 'Oignon 100 g', 'Oignon 1 piece', 'Sel 3 pinch',
  ])
})

test('returns an empty list when nothing is planned', () => {
  assert.deepEqual(aggregateIngredients([]), [])
})

test('compares items of the same ingredient in base units', () => {
  assert.equal(itemKey('flour', 'g'), itemKey('flour', 'kg'))
  assert.notEqual(itemKey('flour', 'g'), itemKey('flour', 'piece'))
  assert.equal(toBaseQuantity(1.5, 'kg'), 1500)
  assert.equal(toBaseQuantity(75, 'cl'), 750)
  assert.equal(toBaseQuantity(2, 'piece'), 2)
})

test('a regenerated item stays purchased only if its quantity did not increase, and manual items are kept', () => {
  const merged = mergeWithPrevious([
    { ingredientId: 'flour', label: 'Farine', quantity: 1, unit: 'kg' },
    { ingredientId: 'milk', label: 'Lait', quantity: 1, unit: 'l' },
    { ingredientId: 'egg', label: 'Œuf', quantity: 6, unit: 'piece' },
  ], [
    { ingredientId: 'flour', label: 'Farine', quantity: 1000, unit: 'g', isPurchased: true, isManual: false },
    { ingredientId: 'milk', label: 'Lait', quantity: 50, unit: 'cl', isPurchased: true, isManual: false },
    { ingredientId: 'egg', label: 'Œuf', quantity: 6, unit: 'piece', isPurchased: false, isManual: false },
    { ingredientId: null, label: 'Éponges', quantity: null, unit: null, isPurchased: true, isManual: true },
  ])
  assert.deepEqual(merged.map(({ label, isPurchased, isManual }) => [label, isPurchased, isManual]), [
    ['Farine', true, false], ['Lait', false, false], ['Œuf', false, false], ['Éponges', true, true],
  ])
})
