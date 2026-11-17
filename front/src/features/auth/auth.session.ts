import { useSyncExternalStore } from 'react'
import type { AuthSession } from './auth.types.ts'

// The access token lives for one hour and cannot be refreshed: the session is dropped when it
// expires and the user signs in again. It is kept in localStorage so it survives a reload and is
// shared between tabs.

const storageKey = 'mealplanner.session'
const listeners = new Set<() => void>()
let current = readStoredSession()
let expiryTimer: number | undefined
scheduleExpiry()

function readStoredSession(): AuthSession | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')
    return isSession(value) && value.expiresAt > Date.now() ? value : null
  } catch {
    return null
  }
}

function isSession(value: unknown): value is AuthSession {
  const session = value as AuthSession | null
  return (
    typeof session?.accessToken === 'string' &&
    typeof session.expiresAt === 'number' &&
    typeof session.user?.id === 'string' &&
    typeof session.user.email === 'string' &&
    typeof session.user.displayName === 'string'
  )
}

function setCurrent(session: AuthSession | null) {
  current = session
  scheduleExpiry()
  listeners.forEach((listener) => listener())
}

function scheduleExpiry() {
  window.clearTimeout(expiryTimer)
  // setTimeout cannot wait longer than about 24.8 days; tokens last one hour.
  if (current) expiryTimer = window.setTimeout(clearSession, Math.min(current.expiresAt - Date.now(), 2 ** 31 - 1))
}

export function saveSession(session: AuthSession) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(session))
  } catch {
    // Storage can be unavailable (private browsing): keep the session for this tab only.
  }
  setCurrent(session)
}

export function clearSession() {
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // Nothing to remove.
  }
  setCurrent(null)
}

function subscribe(listener: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) setCurrent(readStoredSession())
  }
  listeners.add(listener)
  window.addEventListener('storage', handleStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}

export function useSession() {
  return useSyncExternalStore(subscribe, () => current)
}
