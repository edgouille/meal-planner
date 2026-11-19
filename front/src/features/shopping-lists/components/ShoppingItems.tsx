import { formatQuantity, groupByAisle } from '../shopping-lists.format.ts'
import type { ShoppingList, ShoppingListItem } from '../shopping-lists.types.ts'
import styles from './ShoppingItems.module.css'

interface ShoppingItemsProps {
  list: ShoppingList
  disabled?: boolean
  onToggle: (item: ShoppingListItem, isPurchased: boolean) => void
}

export function ShoppingItems({ list, disabled = false, onToggle }: ShoppingItemsProps) {
  return <div className={styles.groups}>
    {groupByAisle(list.items).map(group => <section key={group.title} className={styles.group} aria-label={group.title}>
      <h3>{group.title}</h3>
      <ul className={styles.items}>
        {group.items.map(item => <li key={item.id} className={`${styles.item} ${item.isPurchased ? styles.purchased : ''}`}>
          <label className={styles.check}>
            <input type="checkbox" className={styles.box} checked={item.isPurchased} disabled={disabled}
              onChange={event => onToggle(item, event.target.checked)} />
            <span className={styles.label}>{item.label}</span>
            <span className={styles.quantity}>{formatQuantity(item)}</span>
          </label>
        </li>)}
      </ul>
    </section>)}
  </div>
}
