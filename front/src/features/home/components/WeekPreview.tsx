import styles from './WeekPreview.module.css'

type Moment = 'breakfast' | 'lunch' | 'dinner'

// Illustration of the product, based on the demo recipes from back/scripts/seed.ts.
// Calories per serving come from the recipe_calories view.
const days: Array<{ day: string; date: number; meals: Array<{ moment: Moment; emoji: string; title: string; kcal: number }> }> = [
  {
    day: 'Lun',
    date: 3,
    meals: [
      { moment: 'breakfast', emoji: '🍎', title: 'Porridge pomme', kcal: 377 },
      { moment: 'dinner', emoji: '🍛', title: 'Curry de pois chiches', kcal: 349 },
    ],
  },
  {
    day: 'Mar',
    date: 4,
    meals: [
      { moment: 'lunch', emoji: '🥗', title: 'Bowl quinoa et feta', kcal: 571 },
      { moment: 'dinner', emoji: '🎃', title: 'Velouté de potimarron', kcal: 124 },
    ],
  },
  {
    day: 'Mer',
    date: 5,
    meals: [{ moment: 'lunch', emoji: '🍛', title: 'Curry de pois chiches', kcal: 349 }],
  },
]

const momentLabels: Record<Moment, string> = { breakfast: 'Matin', lunch: 'Midi', dinner: 'Soir' }

const groceries = [
  { label: 'Pois chiches', quantity: '400 g', checked: true },
  { label: 'Potimarron', quantity: '1 pièce', checked: true },
  { label: 'Lait de coco', quantity: '40 cl', checked: false },
  { label: 'Feta', quantity: '100 g', checked: false },
]

export function WeekPreview() {
  return (
    <div className={styles.stage} role="img" aria-label="Aperçu d'un planning de repas et de sa liste de courses">
      <div className={styles.planner} aria-hidden="true">
        <div className={styles.plannerHeader}>
          <strong>Ma semaine</strong>
          <span>3 – 9 novembre</span>
        </div>
        <div className={styles.days}>
          {days.map((day) => (
            <div key={day.day} className={styles.day}>
              <div className={styles.dayLabel}>
                {day.day} <b>{day.date}</b>
              </div>
              {day.meals.map((meal) => (
                <div key={meal.moment} className={`${styles.meal} ${styles[meal.moment]}`}>
                  <span className={styles.emoji}>{meal.emoji}</span>
                  <span className={styles.moment}>{momentLabels[meal.moment]}</span>
                  <span className={styles.mealTitle}>{meal.title}</span>
                  <span className={styles.kcal}>{meal.kcal} kcal</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.groceries} aria-hidden="true">
        <strong>Courses</strong>
        <ul>
          {groceries.map((item) => (
            <li key={item.label} className={item.checked ? styles.checked : undefined}>
              <span className={styles.box}>{item.checked ? '✓' : ''}</span>
              {item.label}
              <small>{item.quantity}</small>
            </li>
          ))}
        </ul>
      </div>

      <span className={styles.sticker} aria-hidden="true">
        −30 min
        <br />
        de casse-tête
      </span>
    </div>
  )
}
