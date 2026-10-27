import styles from './NutritionHighlight.module.css'

// Figures from the Ciqual 2025 import (back/README.md).
const figures = [
  { value: '3 484', label: 'aliments dans le catalogue' },
  { value: '74', label: 'nutriments par aliment' },
  { value: '100 g', label: 'base de chaque valeur nutritionnelle' },
]

export function NutritionHighlight() {
  return (
    <section id="nutrition" className={styles.section}>
      <div className={styles.copy}>
        <p className={styles.kicker}>Nutrition</p>
        <h2>Ce que vous mangez, en toute transparence.</h2>
        <p className={styles.text}>
          Chaque ingrédient s'appuie sur la table Ciqual de l'Anses. MealPlanner calcule les calories, protéines,
          fibres et le reste pour chaque recette, au total et par portion.
        </p>
      </div>
      <dl className={styles.figures}>
        {figures.map((figure) => (
          <div key={figure.label} className={styles.figure}>
            <dt>{figure.label}</dt>
            <dd>{figure.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
