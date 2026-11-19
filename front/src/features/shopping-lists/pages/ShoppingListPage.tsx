import { useEffect, useState } from 'react'
import { currentMonday, dateKey, shiftDays } from '../../../shared/lib/week.ts'
import { generateShoppingList, getShoppingList, updateShoppingListItem } from '../api/shopping-lists.api.ts'
import { PurchaseProgress } from '../components/PurchaseProgress.tsx'
import { ShoppingItems } from '../components/ShoppingItems.tsx'
import type { ShoppingList, ShoppingListItem } from '../shopping-lists.types.ts'
import styles from './ShoppingListPage.module.css'

const rangeLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const generatedLabel = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
type Load = { key: string; status: 'loading' | 'error' | 'ready'; list?: ShoppingList | null }

export function ShoppingListPage() {
  const [monday, setMonday] = useState(currentMonday)
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<Load>()
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set())
  const start = dateKey(monday)
  const end = dateKey(shiftDays(monday, 6))
  const current = load?.key === start ? load : undefined
  const list = current?.list

  useEffect(() => { document.title = 'Mes courses · MealPlanner' }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoad(previous => ({ key: start, status: 'loading', list: previous?.key === start ? previous.list : undefined }))
    getShoppingList(start, end, controller.signal).then(response => {
      if (!controller.signal.aborted) setLoad({ key: start, status: 'ready', list: response.data })
    }, () => {
      if (!controller.signal.aborted) setLoad(previous => previous?.key === start ? { ...previous, status: 'error' } : previous)
    })
    return () => controller.abort()
  }, [start, end, attempt])

  function changeWeek(next: Date) {
    setMonday(next)
    setMessage('')
    setError('')
  }

  async function generate() {
    if (generating) return
    setGenerating(true)
    setMessage('')
    setError('')
    try {
      const { data } = await generateShoppingList(start, end)
      setLoad({ key: start, status: 'ready', list: data })
      setMessage(list ? 'La liste a été mise à jour à partir du planning.' : 'La liste de courses a été générée.')
    } catch {
      setError('La liste n’a pas pu être générée. Réessayez dans un instant.')
    } finally {
      setGenerating(false)
    }
  }

  function setPurchased(listId: string, itemId: string, isPurchased: boolean) {
    setLoad(previous => previous?.list?.id === listId
      ? { ...previous, list: { ...previous.list, items: previous.list.items.map(item => item.id === itemId ? { ...item, isPurchased } : item) } }
      : previous)
  }

  // The box changes immediately; it switches back if the API rejects the change.
  async function togglePurchased(item: ShoppingListItem, isPurchased: boolean) {
    if (!list || saving.has(item.id)) return
    const listId = list.id
    setError('')
    setMessage('')
    setPurchased(listId, item.id, isPurchased)
    setSaving(previous => new Set(previous).add(item.id))
    try {
      await updateShoppingListItem(listId, item.id, isPurchased)
    } catch {
      setPurchased(listId, item.id, !isPurchased)
      setError(`« ${item.label} » n’a pas pu être mis à jour. Vérifiez votre connexion et réessayez.`)
    } finally {
      setSaving(previous => {
        const next = new Set(previous)
        next.delete(item.id)
        return next
      })
    }
  }

  return <main className={styles.main}>
    <p className={styles.kicker}>Le planning, version cabas</p>
    <h1>Mes courses</h1>
    <div className={styles.weekHeading}>
      <h2 aria-live="polite">Du {rangeLabel.format(monday)} au {rangeLabel.format(shiftDays(monday, 6))}</h2>
      <nav className={styles.weekNav} aria-label="Choix de la semaine">
        <button className={styles.button} disabled={generating || shiftDays(monday, -7).getFullYear() < 100}
          onClick={() => changeWeek(shiftDays(monday, -7))}>Semaine précédente</button>
        <button className={styles.button} disabled={generating} onClick={() => changeWeek(currentMonday())}>Cette semaine</button>
        <button className={styles.button} disabled={generating || shiftDays(monday, 13).getFullYear() > 9998}
          onClick={() => changeWeek(shiftDays(monday, 7))}>Semaine suivante</button>
      </nav>
    </div>

    {message && <p className={styles.success} role="status">{message}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}

    <section aria-label="Liste de courses" aria-busy={!current || current.status === 'loading' || generating}>
      {current?.status === 'error' && <div className={styles.error} role="alert">
        <p>Impossible de charger la liste de courses.</p>
        <button className={styles.button} onClick={() => setAttempt(value => value + 1)}>Réessayer</button>
      </div>}
      {list === undefined && current?.status !== 'error' && <p role="status">Chargement de la liste…</p>}

      {list === null && <div className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden="true">🛒</span>
        <h3>Pas encore de liste pour cette semaine</h3>
        <p>MealPlanner additionne les ingrédients des repas de <a href="/planning">votre planning</a> et les range par rayon.</p>
        <button className={styles.primary} onClick={() => void generate()} disabled={generating}>
          {generating ? 'Génération…' : 'Générer la liste de courses'}
        </button>
      </div>}

      {list && <div className={styles.card}>
        <div className={styles.toolbar}>
          <p className={styles.meta}>Générée le {generatedLabel.format(new Date(list.generatedAt))}</p>
          <button className={styles.button} onClick={() => void generate()} disabled={generating || saving.size > 0}>
            {generating ? 'Mise à jour…' : 'Mettre à jour depuis le planning'}
          </button>
        </div>
        {list.items.length === 0
          ? <p className={styles.notice}>Aucun repas n’est planifié cette semaine. Ajoutez des recettes à <a href="/planning">votre planning</a>, puis mettez la liste à jour.</p>
          : <>
            <PurchaseProgress items={list.items} />
            <ShoppingItems list={list} disabled={generating} onToggle={(item, isPurchased) => void togglePurchased(item, isPurchased)} />
          </>}
      </div>}
    </section>
  </main>
}
