import styles from './SiteHeader.module.css'
import { BrandMark } from './BrandMark.tsx'

const links = [
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#etapes', label: 'Comment ça marche' },
  { href: '#nutrition', label: 'Nutrition' },
]

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/" aria-label="MealPlanner, accueil">
          <BrandMark />
          <span>
            Meal<span className={styles.brandLight}>Planner</span>
          </span>
        </a>

        <nav className={styles.nav} aria-label="Sections de la page">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <a className={styles.login} href="/connexion">
            Se connecter
          </a>
          <a className={styles.signup} href="/inscription">
            Créer un compte
          </a>
        </div>
      </div>
    </header>
  )
}
