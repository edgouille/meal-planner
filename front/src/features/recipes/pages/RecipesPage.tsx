import { useEffect } from 'react'
import { BrandMark } from '../../../shared/ui/BrandMark.tsx'
import { RecipeCard } from '../components/RecipeCard.tsx'
import { useRecipes } from '../hooks/useRecipes.ts'
import styles from './RecipesPage.module.css'

export function RecipesPage({ onSignOut }: { onSignOut: () => void }) {
  const { load, page, changePage, retry } = useRecipes()
  const response = load.status === 'ready' ? load.response : undefined
  const pageCount = response ? Math.max(1, Math.ceil(response.pagination.total / response.pagination.pageSize)) : 1

  useEffect(() => { document.title = 'Mes recettes · MealPlanner' }, [])

  return (
    <div>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="/" aria-label="MealPlanner, accueil">
            <BrandMark />
            <span className={styles.brandName}>Meal<span>Planner</span></span>
          </a>
          <nav className={styles.actions} aria-label="Navigation du compte">
            <a className={styles.headerLink} href="/">Accueil</a>
            <a className={styles.headerLink} href="/parametres">Paramètres</a>
            <button className={styles.headerLink} type="button" onClick={onSignOut}>Se déconnecter</button>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <p className={styles.kicker}>Votre carnet de cuisine</p>
        <h1 className={styles.title}>Mes recettes</h1>
        <p className={styles.subtitle}>Retrouvez vos recettes et choisissez votre prochaine idée à cuisiner.</p>

        <section aria-label="Vos recettes" aria-busy={load.status === 'loading'}>
          {load.status === 'loading' && <p className={styles.message} role="status">Chargement de vos recettes…</p>}
          {load.status === 'error' && (
            <div className={styles.error} role="alert">
              <p>{load.message}</p>
              <button className={styles.button} type="button" onClick={retry}>Réessayer</button>
            </div>
          )}
          {response && (
            <>
              <p className={styles.count} role="status">
                {response.pagination.total} {response.pagination.total === 1 ? 'recette' : 'recettes'}
              </p>
              {response.data.length > 0 ? (
                <ul className={styles.grid} aria-label="Liste de recettes">
                  {response.data.map(recipe => <li key={recipe.id}><RecipeCard recipe={recipe} /></li>)}
                </ul>
              ) : (
                <div className={styles.empty}>
                  <span className={styles.emptyMark} aria-hidden="true">✦</span>
                  <h2>{response.pagination.total === 0 ? 'Votre carnet attend ses premières recettes' : 'Cette page ne contient aucune recette'}</h2>
                  <p>{response.pagination.total === 0 ? 'Les recettes enregistrées sur votre compte apparaîtront ici.' : 'Revenez à la première page pour retrouver vos recettes.'}</p>
                  {page > 1 && <button className={styles.button} type="button" onClick={() => changePage(1)}>Revenir à la première page</button>}
                </div>
              )}
              {response.pagination.total > 0 && (
                <nav className={styles.pagination} aria-label="Pagination des recettes">
                  <button className={styles.button} type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>Précédent</button>
                  <p role="status">Page {page} sur {pageCount}</p>
                  <button className={styles.button} type="button" disabled={page >= pageCount} onClick={() => changePage(page + 1)}>Suivant</button>
                </nav>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
