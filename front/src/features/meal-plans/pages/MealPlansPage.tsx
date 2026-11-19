import { useEffect, useState } from 'react'
import { BrandMark } from '../../../shared/ui/BrandMark.tsx'
import { listMeals } from '../api/meal-plans.api.ts'
import { currentMonday, dateKey, shiftDays } from '../meal-plans.dates.ts'
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

export function MealPlansPage({ onSignOut }: { onSignOut: () => void }) {
  const [monday, setMonday] = useState(currentMonday)
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<Load>()
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

  return <div>
    <header className={styles.header}><div className={styles.headerInner}>
      <a className={styles.brand} href="/" aria-label="MealPlanner, accueil"><BrandMark /><span>MealPlanner</span></a>
      <nav className={styles.headerActions} aria-label="Navigation du compte">
        <a href="/recettes">Mes recettes</a><a href="/parametres">Paramètres</a>
        <button type="button" onClick={onSignOut}>Se déconnecter</button>
      </nav>
    </div></header>
    <main className={styles.main}>
      <p className={styles.kicker}>Une semaine à votre goût</p>
      <h1>Mon planning</h1>
      <div className={styles.weekHeading}>
        <h2 aria-live="polite">Du {rangeLabel.format(monday)} au {rangeLabel.format(days[6])}</h2>
        <nav className={styles.weekNav} aria-label="Choix de la semaine">
          <button className={styles.button} disabled={shiftDays(monday, -7).getFullYear() < 100}
            onClick={() => setMonday(shiftDays(monday, -7))}>Semaine précédente</button>
          <button className={styles.button} onClick={() => setMonday(currentMonday())}>Cette semaine</button>
          <button className={styles.button} disabled={shiftDays(monday, 13).getFullYear() > 9998}
            onClick={() => setMonday(shiftDays(monday, 7))}>Semaine suivante</button>
        </nav>
      </div>
      <section aria-label="Planning hebdomadaire" aria-busy={loading}>
        {current?.status === 'error' && <div className={styles.error} role="alert">
          <p>{meals ? 'Impossible d’actualiser le planning.' : 'Impossible de charger le planning.'}</p>
          <button className={styles.button} onClick={() => setAttempt(value => value + 1)}>Réessayer</button></div>}
        {!meals && loading && <p role="status">Chargement de votre semaine…</p>}
        {meals && <>
          {meals.length === 0 && <p className={styles.empty}>Aucun repas n’est planifié cette semaine.</p>}
          <div className={styles.week}>
            {days.map(day => {
              const date = dateKey(day)
              const label = dayLabel.format(day)
              return <section key={date} className={styles.day} aria-label={label}>
                <h3><time dateTime={date}>{label}</time></h3>
                {moments.map(moment => {
                  const meal = meals.find(item => item.date === date && item.moment === moment.value)
                  return <div className={styles.slot} key={moment.value}>
                    <h4>{moment.label}</h4>
                    {meal ? <div className={styles.meal}>
                      <p className={styles.recipeTitle}>{meal.recipe.title}</p><p className={styles.portions}>{meal.servings} portions</p>
                    </div> : <p className={styles.emptySlot}>Aucun repas</p>}
                  </div>
                })}
              </section>
            })}
          </div>
        </>}
      </section>
    </main>
  </div>
}
