import styles from './SiteFooter.module.css'
import { BrandMark } from './BrandMark.tsx'

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <BrandMark />
          <span>
            MealPlanner
            <small>La semaine à croquer.</small>
          </span>
        </div>
        <p className={styles.source}>
          Données nutritionnelles :{' '}
          <a href="https://ciqual.anses.fr/" target="_blank" rel="noreferrer">
            table Ciqual 2025, Anses
          </a>
          , sous Licence Ouverte Etalab 2.0.
        </p>
        <p className={styles.copyright}>© {new Date().getFullYear()} MealPlanner, projet Ynov M2.</p>
      </div>
    </footer>
  )
}
