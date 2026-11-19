import type { ShoppingListItem } from '../shopping-lists.types.ts'
import styles from './PurchaseProgress.module.css'

export function PurchaseProgress({ items }: { items: ShoppingListItem[] }) {
  const purchased = items.filter(item => item.isPurchased).length
  const done = purchased === items.length
  return <div className={styles.progress}>
    <p data-progress aria-live="polite">
      {done ? 'Tout est dans le cabas ! 🎉' : `${purchased} ${purchased > 1 ? 'produits achetés' : 'produit acheté'} sur ${items.length}`}
    </p>
    <div className={styles.track} aria-hidden="true">
      <span className={done ? styles.done : undefined} style={{ width: `${(purchased / items.length) * 100}%` }} />
    </div>
  </div>
}
