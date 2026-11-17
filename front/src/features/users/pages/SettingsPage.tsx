import { useEffect, useId } from 'react'
import { BrandMark } from '../../../shared/ui/BrandMark.tsx'
import { useProfileSettings } from '../hooks/useProfileSettings.ts'
import type { Profile } from '../users.types.ts'
import styles from './SettingsPage.module.css'

export interface SettingsPageProps {
  /** Called with the profile returned by the API after a successful save. */
  onProfileSaved?: (profile: Profile) => void
  onSignOut?: () => void
}

export function SettingsPage({ onProfileSaved, onSignOut }: SettingsPageProps) {
  const id = useId()
  const { load, retry, displayName, changeDisplayName, fieldError, formError, saved, saving, save, inputRef } =
    useProfileSettings(onProfileSaved)

  useEffect(() => {
    document.title = 'Paramètres · MealPlanner'
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="/" aria-label="MealPlanner, accueil">
            <BrandMark />
            <span className={styles.brandName}>
              Meal<span className={styles.brandLight}>Planner</span>
            </span>
          </a>
          <nav className={styles.actions} aria-label="Compte">
            <a className={styles.headerLink} href="/">
              Accueil
            </a>
            {onSignOut && (
              <button className={styles.headerLink} type="button" onClick={onSignOut}>
                Se déconnecter
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Paramètres</h1>
        <p className={styles.subtitle}>Consultez votre adresse e-mail et choisissez le nom affiché dans MealPlanner.</p>

        <section className={styles.card} aria-labelledby={`${id}-profile`} aria-busy={load.status === 'loading'}>
          <h2 id={`${id}-profile`} className={styles.cardTitle}>
            Profil
          </h2>

          {load.status === 'loading' && (
            <p className={styles.loading} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              Chargement de votre profil…
            </p>
          )}

          {load.status === 'error' && (
            <div className={styles.loadError} role="alert">
              <p>{load.message}</p>
              <button className={styles.secondary} type="button" onClick={retry}>
                Réessayer
              </button>
            </div>
          )}

          {load.status === 'ready' && (
            <form className={styles.form} onSubmit={save} noValidate>
              {formError && (
                <p className={styles.alert} role="alert">
                  {formError}
                </p>
              )}

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${id}-email`}>
                  Adresse e-mail
                </label>
                <input
                  id={`${id}-email`}
                  className={`${styles.input} ${styles.readOnly}`}
                  type="email"
                  value={load.profile.email}
                  readOnly
                  aria-describedby={`${id}-email-hint`}
                />
                <p id={`${id}-email-hint`} className={styles.hint}>
                  L’adresse e-mail ne peut pas être modifiée.
                </p>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${id}-name`}>
                  Nom affiché
                </label>
                <input
                  ref={inputRef}
                  id={`${id}-name`}
                  className={`${styles.input} ${fieldError ? styles.invalid : ''}`}
                  type="text"
                  name="displayName"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(event) => changeDisplayName(event.target.value)}
                  aria-invalid={fieldError ? true : undefined}
                  aria-describedby={fieldError ? `${id}-name-error` : `${id}-name-hint`}
                  required
                />
                {fieldError ? (
                  <p id={`${id}-name-error`} className={styles.error}>
                    {fieldError}
                  </p>
                ) : (
                  <p id={`${id}-name-hint`} className={styles.hint}>
                    Entre 1 et 100 caractères.
                  </p>
                )}
              </div>

              <div className={styles.footer}>
                {/* aria-disabled keeps the button focusable while saving; the hook ignores repeated submissions. */}
                <button className={styles.primary} type="submit" aria-disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <p className={styles.status} role="status">
                  {saved && 'Vos modifications ont été enregistrées.'}
                </p>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  )
}
