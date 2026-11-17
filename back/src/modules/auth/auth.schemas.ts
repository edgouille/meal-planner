import { z } from 'zod'

const email = z.string().trim().toLowerCase().max(255).pipe(z.email())
const password = z.string().min(1).max(256)

export const loginBody = z.strictObject({ email, password })

export const registerBody = z.strictObject({
  email,
  password: password.min(12),
  displayName: z.string().trim().min(1).max(100).refine(value => !value.includes('\0')),
})

export const authResponseSchema = z.object({
  data: z.object({
    accessToken: z.string(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().int().positive(),
    user: z.object({ id: z.uuid(), email: z.email(), displayName: z.string() }),
  }),
})

export type LoginInput = z.output<typeof loginBody>
export type RegisterInput = z.output<typeof registerBody>
