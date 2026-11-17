import { useEffect, type ReactNode } from 'react'
import { BrandMark } from '../../../shared/ui/BrandMark.tsx'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  documentTitle: string
  title: string
  subtitle: string
  footer: ReactNode
  children: ReactNode
}

export function AuthLayout({ documentTitle, title, subtitle, footer, children }: AuthLayoutProps) {
  useEffect(() => {
    document.title = `${documentTitle} · MealPlanner`
  }, [documentTitle])

  return (
    <div className={styles.layout}>
      <main className={styles.panel}>
        <a className={styles.brand} href="/" aria-label="MealPlanner, retour à l'accueil">
          <BrandMark />
          <span>
            Meal<span className={styles.brandLight}>Planner</span>
          </span>
        </a>

        <div className={styles.content}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
          <p className={styles.footer}>{footer}</p>
        </div>
      </main>

      <aside className={styles.showcase} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.radish} />
        <div className={styles.showcaseInner}>
          <p className={styles.quote}>« Le dimanche soir, la semaine est prête. Les courses aussi. »</p>
          <div className={styles.cards}>
            <div className={`${styles.card} ${styles.breakfast}`}>
              <span>🍎</span>
              <small>Matin</small>
              <strong>Porridge pomme</strong>
            </div>
            <div className={`${styles.card} ${styles.lunch}`}>
              <span>🥗</span>
              <small>Midi</small>
              <strong>Bowl quinoa et feta</strong>
            </div>
            <div className={`${styles.card} ${styles.dinner}`}>
              <span>🍛</span>
              <small>Soir</small>
              <strong>Curry de pois chiches</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
