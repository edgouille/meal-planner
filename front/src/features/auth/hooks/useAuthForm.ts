import { useEffect, useRef, useState, type FormEvent } from 'react'
import { navigate } from '../../../shared/lib/navigation.ts'
import { saveSession } from '../auth.session.ts'
import type { AuthSession } from '../auth.types.ts'
import { describeApiError, type FieldErrors } from '../auth.validation.ts'

interface AuthFormOptions<Field extends string> {
  initialValues: Record<Field, string>
  validate: (values: Record<Field, string>) => FieldErrors<Field>
  submit: (values: Record<Field, string>, signal: AbortSignal) => Promise<AuthSession>
  /** Messages shown when the API rejects a field. */
  apiFieldMessages: Partial<Record<Field, string>>
}

/** Form state shared by the login and register pages: validation, submission, and API errors. */
export function useAuthForm<Field extends string>({ initialValues, validate, submit, apiFieldMessages }: AuthFormOptions<Field>) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FieldErrors<Field>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const request = useRef<AbortController>(null)

  useEffect(() => () => request.current?.abort(), [])

  // Move focus to the first invalid field after each failed submission.
  useEffect(() => {
    formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  function setValue(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setFormError(undefined)
    const clientErrors = validate(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    request.current = new AbortController()
    setPending(true)
    try {
      saveSession(await submit(values, request.current.signal))
      navigate('/', { replace: true })
    } catch (error) {
      if (request.current.signal.aborted) return
      const described = describeApiError(error, apiFieldMessages)
      setErrors(described.fields)
      setFormError(described.form)
      setPending(false)
    }
  }

  return { values, errors, formError, pending, formRef, setValue, handleSubmit }
}
