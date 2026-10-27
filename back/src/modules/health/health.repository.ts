export interface DatabaseConnection {
  query(text: string): Promise<unknown>
  release(destroy?: boolean): void
}

export interface DatabasePool {
  connect(): Promise<DatabaseConnection>
}

export function createDatabaseProbe(pool: DatabasePool) {
  return async (signal: AbortSignal): Promise<void> => {
    const client = await pool.connect()
    // A client can become available after the HTTP deadline while waiting for the pool.
    if (signal.aborted) {
      client.release()
      throw new Error('Readiness deadline exceeded.')
    }
    let released = false
    function release(destroy = false) {
      if (released) return
      released = true
      client.release(destroy)
    }
    const abort = () => release(true)
    signal.addEventListener('abort', abort, { once: true })
    try {
      await client.query('SELECT 1')
    } catch (error) {
      release(true)
      throw error
    } finally {
      signal.removeEventListener('abort', abort)
      release()
    }
  }
}
