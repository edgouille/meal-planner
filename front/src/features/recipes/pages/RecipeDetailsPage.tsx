import { useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api/api-error.ts'
import { formatQuantity } from '../../../shared/lib/quantity.ts'
import { getRecipe } from '../api/recipes.api.ts'
import type { RecipeDetails } from '../recipes.types.ts'
import styles from './RecipeDetailsPage.module.css'

type Load = { status: 'loading' } | { status: 'not-found' } | { status: 'error' } | { status: 'ready'; recipe: RecipeDetails }

export function RecipeDetailsPage({ id }: { id: string }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoad({ status: 'loading' })
    document.title = 'Recette · MealPlanner'
    getRecipe(id, controller.signal).then(({ data }) => {
      setLoad({ status: 'ready', recipe: data })
      document.title = `${data.title} · MealPlanner`
    }).catch(error => {
      if (!controller.signal.aborted) setLoad({ status: error instanceof ApiError && error.status === 404 ? 'not-found' : 'error' })
    })
    return () => controller.abort()
  }, [id, attempt])
  return (
    <main className={styles.main}>
      <a href="/recettes" className={styles.back}>← Mes recettes</a>
      {load.status === 'loading' && <p role="status">Chargement de la recette…</p>}
      {load.status === 'error' && <div className={styles.message} role="alert"><h1>Impossible de charger la recette</h1><p>Vérifiez votre connexion puis réessayez.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Réessayer</button></div>}
      {load.status === 'not-found' && <div className={styles.message} role="alert"><h1>Recette introuvable</h1><p>Cette recette est introuvable ou n’est pas accessible.</p><a href="/recettes">Retour à mes recettes</a></div>}
      {load.status === 'ready' && <>
        <header className={styles.intro}>
          <p className={styles.kicker}>Votre carnet de cuisine</p>
          <h1>{load.recipe.title}</h1>
          <p className={styles.description}>{load.recipe.description || 'Aucune description pour cette recette.'}</p>
          <ul className={styles.meta}>
            <li>{load.recipe.prepMinutes === null ? 'Temps non renseigné' : `${load.recipe.prepMinutes} min de préparation`}</li>
            <li>{load.recipe.servings} {load.recipe.servings === 1 ? 'portion' : 'portions'}</li>
          </ul>
        </header>
        <div className={styles.sections}>
          <section className={styles.panel}><h2>Ingrédients</h2>
            {load.recipe.ingredients.length ? <ul className={styles.ingredients}>{load.recipe.ingredients.map((item, index) => <li key={`${item.ingredientId}-${item.unit}-${index}`}><span>{item.name}</span><strong>{formatQuantity(item)}</strong></li>)}</ul> : <p>Aucun ingrédient renseigné.</p>}
          </section>
          <section className={styles.panel}><h2>Préparation</h2>
            {load.recipe.steps.length ? <ol className={styles.steps}>{load.recipe.steps.map(step => <li key={step.position}>{step.instruction}</li>)}</ol> : <p>Aucune étape renseignée.</p>}
          </section>
        </div>
      </>}
    </main>
  )
}
