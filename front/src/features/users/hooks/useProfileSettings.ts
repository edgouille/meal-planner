import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../../shared/api/api-error.ts'
import { getProfile, updateProfile } from '../api/users.api.ts'
import type { Profile } from '../users.types.ts'
import { checkDisplayName, describeLoadError, describeSaveError } from '../users.validation.ts'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; profile: Profile }

/**
 * Loads the current profile, then edits and saves the display name.
 * A 401 is handled by the shared client (the session ends and the app shows the sign-in page).
 */
export function useProfileSettings(onSaved?: (profile: Profile) => void) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const saveRequest = useRef<AbortController>(null)

  useEffect(() => {
    const controller = new AbortController()
    getProfile(controller.signal).then(
      (profile) => {
        setLoad({ status: 'ready', profile })
        setDisplayName(profile.displayName)
      },
      (error: unknown) => {
        if (!controller.signal.aborted && !isUnauthorized(error)) setLoad({ status: 'error', message: describeLoadError(error) })
      },
    )
    return () => controller.abort()
  }, [attempt])

  useEffect(() => () => saveRequest.current?.abort(), [])

  // Move focus to the field after a rejected submission so the error is read with it.
  useEffect(() => {
    if (fieldError) inputRef.current?.focus()
  }, [fieldError])

  function retry() {
    setLoad({ status: 'loading' })
    setAttempt((value) => value + 1)
  }

  function changeDisplayName(value: string) {
    setDisplayName(value)
    setFieldError(undefined)
    setFormError(undefined)
    setSaved(false)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || load.status !== 'ready') return
    setSaved(false)
    setFormError(undefined)
    const clientError = checkDisplayName(displayName)
    setFieldError(clientError)
    if (clientError) return

    const controller = new AbortController()
    saveRequest.current = controller
    setSaving(true)
    try {
      const profile = await updateProfile({ displayName: displayName.trim() }, controller.signal)
      setLoad({ status: 'ready', profile })
      setDisplayName(profile.displayName)
      setSaved(true)
      onSaved?.(profile)
    } catch (error) {
      if (controller.signal.aborted || isUnauthorized(error)) return
      const described = describeSaveError(error)
      setFieldError(described.field)
      setFormError(described.form)
    } finally {
      if (!controller.signal.aborted) setSaving(false)
    }
  }

  return { load, retry, displayName, changeDisplayName, fieldError, formError, saved, saving, save, inputRef }
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401
}
