import { z } from 'zod'

export const healthResponseSchema = z.object({ data: z.object({ status: z.literal('ok') }) })
export const readinessResponseSchema = z.object({ data: z.object({ status: z.literal('ready') }) })
export type HealthResponse = z.infer<typeof healthResponseSchema>
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>
