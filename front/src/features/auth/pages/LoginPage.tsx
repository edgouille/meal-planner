import { login } from '../api/auth.api.ts'
import { checkEmail, checkPassword, withoutEmpty } from '../auth.validation.ts'
import { AuthLayout } from '../components/AuthLayout.tsx'
import { FormField } from '../components/FormField.tsx'
import { useAuthForm } from '../hooks/useAuthForm.ts'
import styles from './AuthForm.module.css'

export function LoginPage() {
  const { values, errors, formError, pending, formRef, setValue, handleSubmit } = useAuthForm({
    initialValues: { email: '', password: '' },
    validate: ({ email, password }) => withoutEmpty({ email: checkEmail(email), password: checkPassword(password) }),
    submit: ({ email, password }, signal) => login({ email: email.trim(), password }, signal),
    apiFieldMessages: { email: 'Cette adresse e-mail n’est pas valide.', password: 'Ce mot de passe n’est pas valide.' },
  })

  return (
    <AuthLayout
      documentTitle="Connexion"
      title="Content de vous revoir"
      subtitle="Connectez-vous pour retrouver vos recettes et votre semaine."
      footer={
        <>
          Pas encore de compte ? <a href="/inscription">Créer un compte</a>
        </>
      }
    >
      <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className={styles.alert} role="alert">
            {formError}
          </p>
        )}
        <FormField
          label="Adresse e-mail"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={(event) => setValue('email', event.target.value)}
          error={errors.email}
          required
        />
        <FormField
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => setValue('password', event.target.value)}
          error={errors.password}
          revealable
          required
        />
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthLayout>
  )
}
