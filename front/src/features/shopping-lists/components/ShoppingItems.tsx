import { formatQuantity, groupByAisle } from '../shopping-lists.format.ts'
import type { ShoppingList } from '../shopping-lists.types.ts'
import styles from './ShoppingItems.module.css'

export function ShoppingItems({ list }: { list: ShoppingList }) {
  return <div className={styles.groups}>
    {groupByAisle(list.items).map(group => <section key={group.title} className={styles.group} aria-label={group.title}>
      <h3>{group.title}</h3>
      <ul className={styles.items}>
        {group.items.map(item => <li key={item.id} className={styles.item}>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.quantity}>{formatQuantity(item)}</span>
        </li>)}
      </ul>
    </section>)}
  </div>
}
