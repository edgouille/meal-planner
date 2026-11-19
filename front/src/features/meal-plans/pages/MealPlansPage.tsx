import { useEffect, useRef, useState } from 'react'
import { listMeals, removeMeal } from '../api/meal-plans.api.ts'
import { RecipePicker, type RecipePickerResult, type SearchRecipes } from '../components/RecipePicker.tsx'
import { currentMonday, dateKey, shiftDays } from '../../../shared/lib/week.ts'
import type { MealMoment, PlannedMeal } from '../meal-plans.types.ts'
import styles from './MealPlansPage.module.css'

const moments: { value: MealMoment; label: string }[] = [
  { value: 'breakfast', label: 'Petit-déjeuner' },
  { value: 'lunch', label: 'Déjeuner' },
  { value: 'dinner', label: 'Dîner' },
]
const dayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const rangeLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
type Load = { key: string; status: 'loading' | 'error' | 'ready'; meals?: PlannedMeal[] }

export function MealPlansPage({ searchRecipes }: { searchRecipes: SearchRecipes }) {
  const [monday, setMonday] = useState(currentMonday)
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<Load>()
  const [selected, setSelected] = useState<{ date: string; moment: MealMoment; label: string }>()
  const selectedSlotHeading = useRef<HTMLHeadingElement>(null)
  const [removing, setRemoving] = useState('')
  const removingRef = useRef(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const start = dateKey(monday)
  const end = dateKey(shiftDays(monday, 6))
  const days = Array.from({ length: 7 }, (_, index) => shiftDays(monday, index))
  const current = load?.key === start ? load : undefined
  const meals = current?.meals
  const loading = !current || current.status === 'loading'

  useEffect(() => { document.title = 'Mon planning · MealPlanner' }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoad(previous => ({ key: start, status: 'loading', meals: previous?.key === start ? previous.meals : undefined }))
    listMeals(start, end, controller.signal).then(response => {
      if (!controller.signal.aborted) setLoad({ status: 'ready', meals: response.data, key: start })
    }, () => {
      if (!controller.signal.aborted) {
        setLoad(previous => previous?.key === start ? { ...previous, status: 'error' } : previous)
      }
    })
    return () => controller.abort()
  }, [start, end, attempt])

  function changeWeek(next: Date) {
    setMonday(next)
    setError('')
    setMessage('')
  }
  function refreshMeals(update?: (meals: PlannedMeal[]) => PlannedMeal[]) {
    if (update) {
      setLoad(previous => previous?.key === start && previous.meals
        ? { ...previous, meals: update(previous.meals) }
        : previous)
    }
    setAttempt(value => value + 1)
  }

  function closePicker(result: RecipePickerResult) {
    if (result.kind !== 'cancelled') selectedSlotHeading.current?.focus({ preventScroll: true })
    setSelected(undefined)
    if (result.kind === 'cancelled') return

    if (result.kind === 'saved') {
      const { meal } = result
      setMessage('Le repas a été ajouté au planning.')
      refreshMeals(previous => [...previous.filter(item => item.date !== meal.date || item.moment !== meal.moment), meal])
    } else {
      refreshMeals()
    }
  }

  async function remove(meal: PlannedMeal) {
    if (removingRef.current) return
    removingRef.current = true
    setRemoving(meal.id)
    setError('')
    setMessage('')
    try {
      await removeMeal(meal.id)
      setMessage('Le repas a été retiré du planning.')
      refreshMeals(previous => previous.filter(item => item.id !== meal.id))
    } catch {
      setError('Le repas n’a pas pu être retiré. Actualisez le planning puis réessayez.')
    } finally { removingRef.current = false; setRemoving('') }
  }

  return <div>
    <main className={styles.main}>
      <p className={styles.kicker}>Une semaine à votre goût</p>
      <h1>Mon planning</h1>
      <div className={styles.weekHeading}>
        <h2 aria-live="polite">Du {rangeLabel.format(monday)} au {rangeLabel.format(days[6])}</h2>
        <nav className={styles.weekNav} aria-label="Choix de la semaine">
          <button className={styles.button} disabled={!!removing || shiftDays(monday, -7).getFullYear() < 100}
            onClick={() => changeWeek(shiftDays(monday, -7))}>Semaine précédente</button>
          <button className={styles.button} disabled={!!removing} onClick={() => changeWeek(currentMonday())}>Cette semaine</button>
          <button className={styles.button} disabled={!!removing || shiftDays(monday, 13).getFullYear() > 9998}
            onClick={() => changeWeek(shiftDays(monday, 7))}>Semaine suivante</button>
        </nav>
      </div>
      {message && <p className={styles.success} role="status">{message}</p>}
      {error && <div className={styles.error} role="alert"><p>{error}</p>
        <button className={styles.button} onClick={() => refreshMeals()}>Actualiser</button></div>}
      <section aria-label="Planning hebdomadaire" aria-busy={loading}>
        {current?.status === 'error' && <div className={styles.error} role="alert">
          <p>{meals ? 'Impossible d’actualiser le planning.' : 'Impossible de charger le planning.'}</p>
          <button className={styles.button} onClick={() => refreshMeals()}>Réessayer</button></div>}
        {!meals && loading && <p role="status">Chargement de votre semaine…</p>}
        {meals && <>
          {meals.length === 0 && <p className={styles.empty}>Votre semaine est libre. Ajoutez une recette au créneau de votre choix.</p>}
          <div className={styles.week}>
            {days.map(day => {
              const date = dateKey(day)
              const label = dayLabel.format(day)
              return <section key={date} className={styles.day} aria-label={label}>
                <h3><time dateTime={date}>{label}</time></h3>
                {moments.map(moment => {
                  const meal = meals.find(item => item.date === date && item.moment === moment.value)
                  const slotLabel = `${moment.label}, ${label}`
                  const isSelected = selected?.date === date && selected.moment === moment.value
                  return <div className={styles.slot} key={moment.value}>
                    <h4 ref={isSelected ? selectedSlotHeading : undefined} tabIndex={-1}>{moment.label}</h4>
                    {meal ? <div className={styles.meal}>
                      <p className={styles.recipeTitle}>{meal.recipe.title}</p><p className={styles.portions}>{meal.servings} portions</p>
                      <button className={styles.remove} disabled={!!removing || loading} onClick={() => void remove(meal)}
                        aria-label={`Retirer ${meal.recipe.title}, ${slotLabel}`}>{removing === meal.id ? 'Suppression…' : 'Retirer'}</button>
                    </div> : <button className={styles.add} disabled={!!removing || loading}
                      aria-label={`Ajouter une recette, ${slotLabel}`}
                      onClick={event => {
                        event.currentTarget.focus({ preventScroll: true })
                        setMessage('')
                        setSelected({ date, moment: moment.value, label: slotLabel })
                      }}>
                      <span aria-hidden="true">+</span> Ajouter une recette
                    </button>}
                  </div>
                })}
              </section>
            })}
          </div>
        </>}
      </section>
    </main>
    {selected && <RecipePicker {...selected} searchRecipes={searchRecipes} onClose={closePicker} />}
  </div>
}
