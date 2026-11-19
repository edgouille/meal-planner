import styles from './SiteHeader.module.css'
import { BrandMark } from '../../../shared/ui/BrandMark.tsx'

const links = [
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#etapes', label: 'Comment ça marche' },
  { href: '#nutrition', label: 'Nutrition' },
]

const accountLinks = [
  { href: '/recettes', label: 'Mes recettes' },
  { href: '/parametres', label: 'Paramètres' },
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

        <nav className={styles.nav} aria-label={userName ? 'Navigation principale' : 'Sections de la page'}>
          {(userName ? accountLinks : links).map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          {userName ? (
            <>
              <span className={styles.greeting} title={userName}>
                <span className={styles.avatar} aria-hidden="true">{userName.trim().charAt(0).toLocaleUpperCase('fr')}</span>
                <span className={styles.accountName}>{userName}</span>
              </span>
              <button className={styles.logout} type="button" onClick={onSignOut} aria-label="Se déconnecter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.logoutLabel}>Se déconnecter</span>
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
