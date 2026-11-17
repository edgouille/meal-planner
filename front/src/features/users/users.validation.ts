import { ApiError, networkErrorCode } from '../../shared/api/api-error.ts'

// Same rule as PATCH /api/users/me (back/README.md, "Users API"): 1–100 characters after trimming.
// The check gives immediate feedback; the API remains the authority.
export const displayNameMaxLength = 100

export function checkDisplayName(displayName: string) {
  const value = displayName.trim()
  if (!value) return 'Indiquez le nom à afficher.'
  if (value.length > displayNameMaxLength) {
    return `${displayNameMaxLength} caractères maximum (actuellement ${value.length}).`
  }
}

const networkMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'

export function describeLoadError(error: unknown) {
  if (error instanceof ApiError && error.code === networkErrorCode) return networkMessage
  if (error instanceof ApiError && error.code === 'USER_NOT_FOUND') return 'Ce compte est introuvable. Reconnectez-vous pour continuer.'
  return 'Impossible de charger votre profil pour le moment.'
}

/** Messages for a failed save. The typed name is kept so the user can retry. */
export function describeSaveError(error: unknown): { field?: string; form?: string } {
  if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
    return { field: `Le nom affiché doit contenir entre 1 et ${displayNameMaxLength} caractères.` }
  }
  if (error instanceof ApiError && error.code === networkErrorCode) {
    return { form: `${networkMessage} Votre saisie est conservée.` }
  }
  if (error instanceof ApiError && error.code === 'USER_NOT_FOUND') {
    return { form: 'Ce compte est introuvable. Reconnectez-vous pour continuer.' }
  }
  return { form: 'L’enregistrement a échoué. Votre saisie est conservée : réessayez dans un instant.' }
}
