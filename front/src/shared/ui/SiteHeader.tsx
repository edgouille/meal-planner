import styles from './SiteHeader.module.css'
import { BrandMark } from './BrandMark.tsx'

const links = [
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#etapes', label: 'Comment ça marche' },
  { href: '#nutrition', label: 'Nutrition' },
]

const accountLinks = [
  { href: '/', label: 'Accueil' },
  { href: '/recettes', label: 'Mes recettes' },
  { href: '/planning', label: 'Mon planning' },
]

export interface SiteHeaderProps {
  /** Name of the signed-in user, if any. */
  userName?: string
  currentPath: string
  onSignOut?: () => void
}

export function SiteHeader({ userName, currentPath, onSignOut }: SiteHeaderProps) {
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
            <a key={link.href} href={link.href} aria-current={link.href === currentPath ? 'page' : undefined}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          {userName ? (
            <>
              <span className={styles.greeting} title={userName}>
                <span className={styles.avatar} aria-hidden="true">{Array.from(userName.trim())[0]?.toLocaleUpperCase('fr')}</span>
                <span className={styles.accountName}>{userName}</span>
              </span>
              <a className={styles.iconLink} href="/parametres" aria-label="Paramètres" title="Paramètres"
                aria-current={currentPath === '/parametres' ? 'page' : undefined}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <polygon points="19.96,11.22 21.95,12.98 21.57,14.90 19.06,15.77 18.18,17.08 18.34,19.73 16.71,20.82 14.32,19.66 12.78,19.96 11.02,21.95 9.10,21.57 8.23,19.06 6.92,18.18 4.27,18.34 3.18,16.71 4.34,14.32 4.04,12.78 2.05,11.02 2.43,9.10 4.94,8.23 5.82,6.92 5.66,4.27 7.29,3.18 9.68,4.34 11.22,4.04 12.98,2.05 14.90,2.43 15.77,4.94 17.08,5.82 19.73,5.66 20.82,7.29 19.66,9.68" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </a>
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
