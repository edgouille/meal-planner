import styles from './FeatureList.module.css'

const features = [
  {
    icon: '📖',
    tone: styles.green,
    title: 'Vos recettes, bien rangées',
    text: 'Ingrédients, quantités, étapes et temps de préparation : toutes vos recettes au même endroit, prêtes à resservir.',
  },
  {
    icon: '🗓️',
    tone: styles.sun,
    title: 'Un planning qui tient la route',
    text: 'Glissez une recette sur un jour et un moment, matin, midi ou soir. Ajustez les portions pour toute la tablée.',
  },
  {
    icon: '🛒',
    tone: styles.radish,
    title: 'Les courses sans y penser',
    text: 'La liste se remplit à partir de votre semaine, quantités additionnées et triées par rayon. Cochez en magasin.',
  },
]

export function FeatureList() {
  return (
    <section id="fonctionnalites" className={styles.section}>
      <div className={styles.heading}>
        <p className={styles.kicker}>Fonctionnalités</p>
        <h2>Tout ce qu'il faut pour bien manger toute la semaine.</h2>
      </div>
      <div className={styles.grid}>
        {features.map((feature) => (
          <article key={feature.title} className={styles.card}>
            <span className={`${styles.icon} ${feature.tone}`} aria-hidden="true">
              {feature.icon}
            </span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
