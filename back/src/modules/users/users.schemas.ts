import { z } from 'zod'

// Same rule as registration: 1–100 characters once surrounding whitespace is removed.
export const displayName = z.string().trim().min(1).max(100).refine(value => !value.includes('\0'))

// Strict: unknown fields such as email or userId are rejected, not silently ignored.
export const updateProfileBody = z.strictObject({ displayName })

export const profileSchema = z.object({
  email: z.email(),
  displayName: z.string(),
})

export const profileResponseSchema = z.object({ data: profileSchema })

export type UpdateProfileInput = z.output<typeof updateProfileBody>
export type Profile = z.output<typeof profileSchema>
export type ProfileResponse = z.output<typeof profileResponseSchema>
