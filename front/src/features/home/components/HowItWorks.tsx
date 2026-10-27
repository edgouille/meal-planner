import styles from './HowItWorks.module.css'

const steps = [
  { title: 'Ajoutez vos recettes', text: 'Choisissez les ingrédients dans un catalogue de plus de 3 000 aliments et notez les étapes.' },
  { title: 'Planifiez la semaine', text: 'Placez chaque recette sur un jour et un repas, avec le nombre de portions voulu.' },
  { title: 'Faites vos courses', text: 'Générez la liste de la période, puis cochez les produits au fil des rayons.' },
]

export function HowItWorks() {
  return (
    <section id="etapes" className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.kicker}>Comment ça marche</p>
        <h2>Trois étapes, et la semaine est bouclée.</h2>
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
