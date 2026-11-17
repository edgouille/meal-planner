import styles from './SiteHeader.module.css'
import { BrandMark } from '../../../shared/ui/BrandMark.tsx'

const links = [
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#etapes', label: 'Comment ça marche' },
  { href: '#nutrition', label: 'Nutrition' },
]

export interface SiteHeaderProps {
  /** Name of the signed-in user, if any. */
  userName?: string
  onSignOut?: () => void
}

export function SiteHeader({ userName, onSignOut }: SiteHeaderProps) {
  return (
    <header className={`${styles.header} ${userName ? styles.signedIn : ''}`}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/" aria-label="MealPlanner, accueil">
          <BrandMark />
          <span className={styles.brandName}>
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
          {userName ? (
            <>
              <span className={styles.greeting}>
                Bonjour, <strong>{userName}</strong>
              </span>
              <a className={styles.settings} href="/parametres">
                Paramètres
              </a>
              <button className={styles.login} type="button" onClick={onSignOut}>
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <a className={styles.login} href="/connexion">
                Se connecter
              </a>
              <a className={styles.signup} href="/inscription">
                Créer un compte
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
