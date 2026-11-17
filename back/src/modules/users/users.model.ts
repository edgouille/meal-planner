export interface User {
  id: string
  email: string
  displayName: string
  createdAt: Date
}

// Select these columns explicitly when reading a user profile.
export interface UserRow {
  id: string
  email: string
  display_name: string
  created_at: Date
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  }
}
