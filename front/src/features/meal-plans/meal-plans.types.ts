export type MealMoment = 'breakfast' | 'lunch' | 'dinner'
export interface PlannedMeal {
  id: string
  date: string
  moment: MealMoment
  servings: number
  recipe: { id: string; title: string }
}
