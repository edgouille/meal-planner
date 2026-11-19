import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../../shared/api/api-error.ts'
import { planMeal } from '../api/meal-plans.api.ts'
import type { MealMoment, PlannedMeal } from '../meal-plans.types.ts'
import styles from '../pages/MealPlansPage.module.css'

export interface RecipeOption { id: string; title: string; servings: number }
export type SearchRecipes = (criteria: { q: string; page: number }, signal: AbortSignal) => Promise<{
  data: RecipeOption[]; pagination: { page: number; pageSize: number; total: number }
}>

export type RecipePickerResult = { kind: 'cancelled' | 'conflict' } | { kind: 'saved'; meal: PlannedMeal }

interface Props {
  date: string
  moment: MealMoment
  label: string
  searchRecipes: SearchRecipes
  onClose: (result: RecipePickerResult) => void
}
export function RecipePicker({ date, moment, label, searchRecipes, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [criteria, setCriteria] = useState({ q: '', page: 1 })
  const [draft, setDraft] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Awaited<ReturnType<SearchRecipes>>>()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [slotOccupied, setSlotOccupied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { dialog.current?.showModal() }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(false)
    searchRecipes(criteria, controller.signal).then(response => {
      if (!controller.signal.aborted) { setResult(response); setLoading(false) }
    }, () => {
      if (!controller.signal.aborted) { setLoadError(true); setLoading(false) }
    })
    return () => controller.abort()
  }, [criteria, attempt, searchRecipes])

  function search(event: FormEvent) {
    event.preventDefault()
    setCriteria({ q: draft.trim(), page: 1 })
  }
  function close(result: RecipePickerResult) {
    dialog.current?.close()
    onClose(result)
  }

  function dismiss() {
    if (!savingRef.current) close({ kind: slotOccupied ? 'conflict' : 'cancelled' })
  }

  async function choose(recipeId: string) {
    if (savingRef.current || slotOccupied) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const { data: meal } = await planMeal(date, moment, recipeId)
      close({ kind: 'saved', meal })
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setSlotOccupied(true)
        setError('Ce créneau est déjà occupé. Fermez cette fenêtre pour actualiser le planning.')
      } else {
        setError(cause instanceof ApiError && cause.status === 404
          ? 'Cette recette est indisponible. Choisissez une autre recette.'
          : 'Le repas n’a pas pu être enregistré. Réessayez.')
      }
    } finally { savingRef.current = false; setSaving(false) }
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="picker-title"
      onCancel={event => { event.preventDefault(); dismiss() }}>
      <div className={styles.dialogHeading}>
        <div><p className={styles.kicker}>{label}</p><h2 id="picker-title">Choisir une recette</h2></div>
        <button type="button" className={styles.button} onClick={dismiss} disabled={saving}>Fermer</button>
      </div>
      <form className={styles.search} role="search" onSubmit={search}>
        <label htmlFor="recipe-search">Rechercher dans mes recettes</label>
        <div className={styles.searchRow}>
          <input id="recipe-search" type="search" maxLength={150} value={draft}
            disabled={saving} onChange={event => setDraft(event.target.value)} />
          <button className={styles.button} disabled={saving}>Rechercher</button>
        </div>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div aria-busy={loading || saving}>
        {loading && <p role="status">Chargement des recettes…</p>}
        {loadError && <div role="alert"><p>Impossible de charger vos recettes.</p>
          <button className={styles.button} onClick={() => setAttempt(value => value + 1)}>Réessayer</button></div>}
        {!loading && !loadError && result && <>
          {result.data.length === 0 && <p>{criteria.q ? 'Aucune recette ne correspond à cette recherche.' : 'Aucune recette disponible sur cette page.'}</p>}
          <ul className={styles.recipeList}>
            {result.data.map(recipe => <li key={recipe.id}>
              <div><strong>{recipe.title}</strong><span>{recipe.servings} portions</span></div>
              <button className={styles.button} disabled={saving || slotOccupied} onClick={() => void choose(recipe.id)}
                aria-label={`Planifier ${recipe.title}`}>Choisir</button>
            </li>)}
          </ul>
          {result.pagination.total > 0 && <nav className={styles.pager} aria-label="Pages de recettes">
            <button className={styles.button} disabled={saving || criteria.page === 1}
              onClick={() => setCriteria(previous => ({ ...previous, page: previous.page - 1 }))}>Précédent</button>
            <span>Page {criteria.page} sur {Math.max(1, Math.ceil(result.pagination.total / result.pagination.pageSize))}</span>
            <button className={styles.button} disabled={saving || criteria.page * result.pagination.pageSize >= result.pagination.total}
              onClick={() => setCriteria(previous => ({ ...previous, page: previous.page + 1 }))}>Suivant</button>
          </nav>}
        </>}
        {saving && <p role="status">Enregistrement du repas…</p>}
      </div>
    </dialog>
  )
}
