import styles from './CallToAction.module.css'

export function CallToAction() {
  return (
    <section className={styles.wrapper}>
      <div className={styles.band}>
        <span className={styles.emojis} aria-hidden="true">
          🥕 🍅 🥑
        </span>
        <h2>Prêt à mettre la semaine au menu ?</h2>
        <p>Créez votre compte et planifiez vos premiers repas en quelques minutes.</p>
        <a className={styles.button} href="/inscription">
          Créer mon compte
        </a>
      </div>
    </section>
  )
}
