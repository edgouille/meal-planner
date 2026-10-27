import styles from './Hero.module.css'
import { WeekPreview } from './WeekPreview.tsx'

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          <span aria-hidden="true" /> Recettes, planning et courses au même endroit
        </p>
        <h1 className={styles.title}>
          La semaine <span className={styles.highlight}>à croquer</span>.
        </h1>
        <p className={styles.lead}>
          Rangez vos recettes, placez-les dans la semaine et laissez MealPlanner préparer la liste de courses. Fini le
          « on mange quoi ce soir ? ».
        </p>
        <div className={styles.ctas}>
          <a className={styles.primary} href="/inscription">
            Commencer gratuitement
          </a>
          <a className={styles.secondary} href="#etapes">
            Voir comment ça marche
          </a>
        </div>
        <ul className={styles.proof}>
          <li>Planning sur 7 jours</li>
          <li>Liste de courses générée</li>
          <li>Calories par portion</li>
        </ul>
      </div>

      <WeekPreview />
    </section>
  )
}
