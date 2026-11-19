import type { RecipeSummary } from '../recipes.types.ts'
import styles from './RecipeCard.module.css'

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <article className={styles.card}>
      <div className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" width="30" height="30">
          <path d="M25 6C12 5 5 11 8 20c9 3 15-4 17-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M6 26 20 12M12 20v-7M12 20h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className={styles.title}>{recipe.title}</h2>
      <p className={`${styles.description} ${recipe.description ? '' : styles.missing}`}>
        {recipe.description || 'Aucune description pour cette recette.'}
      </p>
      <ul className={styles.meta} aria-label="Informations sur la recette">
        <li>{recipe.prepMinutes === null ? 'Temps non renseigné' : `${recipe.prepMinutes} min de préparation`}</li>
        <li>{recipe.servings} {recipe.servings === 1 ? 'portion' : 'portions'}</li>
      </ul>
    </article>
  )
}
