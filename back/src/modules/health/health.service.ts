export type DatabaseProbe = (signal: AbortSignal) => Promise<void>

export function createHealthService(probe: DatabaseProbe, timeoutMs: number) {
  return {
    async isReady(): Promise<boolean> {
      const controller = new AbortController()
      let timeout: NodeJS.Timeout | undefined
      try {
        await Promise.race([
          probe(controller.signal),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              controller.abort()
              reject(new Error('Readiness deadline exceeded.'))
            }, timeoutMs)
          }),
        ])
        return true
      } catch {
        return false
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}

export type HealthService = ReturnType<typeof createHealthService>
