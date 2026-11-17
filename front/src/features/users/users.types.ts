// Mirrors back/src/modules/users/users.schemas.ts. Replace with the generated API types once
// the OpenAPI document is available (ARCHI.md, SCRUM-54).

export interface Profile {
  email: string
  displayName: string
}

export interface ProfileResponse {
  data: Profile
}

export interface UpdateProfileInput {
  displayName: string
}
