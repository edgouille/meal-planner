// Mirrors back/src/modules/auth/auth.schemas.ts. Replace with the generated API types once
// the OpenAPI document is available (ARCHI.md, SCRUM-54).

export interface AuthUser {
  id: string
  email: string
  displayName: string
}

export interface AuthResponse {
  data: {
    accessToken: string
    tokenType: 'Bearer'
    expiresIn: number
    user: AuthUser
  }
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  displayName: string
}

export interface AuthSession {
  accessToken: string
  /** Expiry as a timestamp in milliseconds. */
  expiresAt: number
  user: AuthUser
}
