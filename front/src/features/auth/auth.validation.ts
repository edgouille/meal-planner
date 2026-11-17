import { ApiError, networkErrorCode } from '../../shared/api/api-error.ts'

// Client checks follow the API rules (back/README.md, "Authentication API") so most mistakes are
// shown before submitting. The API remains the authority and its errors are mapped below.

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

export const passwordMinLength = 12
const passwordMaxLength = 256
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function checkEmail(email: string) {
  const value = email.trim()
  if (!value) return 'Saisissez votre adresse e-mail.'
  if (value.length > 255 || !emailPattern.test(value)) return 'Cette adresse e-mail n’est pas valide.'
}

export function checkPassword(password: string) {
  if (!password) return 'Saisissez votre mot de passe.'
  if (password.length > passwordMaxLength) return `${passwordMaxLength} caractères maximum.`
}

export function checkNewPassword(password: string) {
  if (password.length < passwordMinLength) return `Au moins ${passwordMinLength} caractères.`
  return checkPassword(password)
}

export function checkDisplayName(displayName: string) {
  const value = displayName.trim()
  if (!value) return 'Indiquez comment vous appeler.'
  if (value.length > 100) return '100 caractères maximum.'
}

export function withoutEmpty<Field extends string>(errors: Record<Field, string | undefined>): FieldErrors<Field> {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as FieldErrors<Field>
}

/** Turns an API error into messages for the form and its fields. */
export function describeApiError<Field extends string>(error: unknown, fieldMessages: Partial<Record<Field, string>>) {
  const fields: FieldErrors<Field> = {}
  if (!(error instanceof ApiError)) return { fields, form: unexpectedError }

  switch (error.code) {
    case networkErrorCode:
      return { fields, form: 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.' }
    case 'INVALID_CREDENTIALS':
      return { fields, form: 'E-mail ou mot de passe incorrect.' }
    case 'EMAIL_ALREADY_REGISTERED':
      return { fields: { email: 'Un compte existe déjà avec cette adresse.' } as FieldErrors<Field>, form: undefined }
    case 'VALIDATION_ERROR':
      for (const detail of error.details) {
        const field = detail.field.replace(/^body\./, '') as Field
        const message = fieldMessages[field]
        if (message) fields[field] = message
      }
      return { fields, form: Object.keys(fields).length ? undefined : 'Certaines informations ne sont pas valides.' }
    default:
      return { fields, form: unexpectedError }
  }
}

const unexpectedError = 'Une erreur est survenue. Réessayez dans un instant.'
