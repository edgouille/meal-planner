import { register } from '../api/auth.api.ts'
import {
  checkDisplayName,
  checkEmail,
  checkNewPassword,
  passwordMinLength,
  withoutEmpty,
} from '../auth.validation.ts'
import { AuthLayout } from '../components/AuthLayout.tsx'
import { FormField } from '../components/FormField.tsx'
import { useAuthForm } from '../hooks/useAuthForm.ts'
import styles from './AuthForm.module.css'

export function RegisterPage() {
  const { values, errors, formError, pending, formRef, setValue, handleSubmit } = useAuthForm({
    initialValues: { displayName: '', email: '', password: '', confirmation: '' },
    validate: ({ displayName, email, password, confirmation }) =>
      withoutEmpty({
        displayName: checkDisplayName(displayName),
        email: checkEmail(email),
        password: checkNewPassword(password),
        confirmation: confirmation === password ? undefined : 'Les mots de passe ne correspondent pas.',
      }),
    submit: ({ displayName, email, password }, signal) =>
      register({ displayName: displayName.trim(), email: email.trim(), password }, signal),
    apiFieldMessages: {
      displayName: 'Ce nom n’est pas valide.',
      email: 'Cette adresse e-mail n’est pas valide.',
      password: `Le mot de passe doit contenir entre ${passwordMinLength} et 256 caractères.`,
    },
  })

  return (
    <AuthLayout
      documentTitle="Inscription"
      title="Créez votre compte"
      subtitle="Quelques secondes pour mettre la semaine au menu."
      footer={
        <>
          Déjà inscrit ? <a href="/connexion">Se connecter</a>
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
          label="Nom affiché"
          name="displayName"
          autoComplete="nickname"
          maxLength={100}
          value={values.displayName}
          onChange={(event) => setValue('displayName', event.target.value)}
          error={errors.displayName}
          required
        />
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
          autoComplete="new-password"
          hint={`Au moins ${passwordMinLength} caractères.`}
          value={values.password}
          onChange={(event) => setValue('password', event.target.value)}
          error={errors.password}
          revealable
          required
        />
        <FormField
          label="Confirmer le mot de passe"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          value={values.confirmation}
          onChange={(event) => setValue('confirmation', event.target.value)}
          error={errors.confirmation}
          revealable
          required
        />
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? 'Création du compte…' : 'Créer mon compte'}
        </button>
      </form>
    </AuthLayout>
  )
}
