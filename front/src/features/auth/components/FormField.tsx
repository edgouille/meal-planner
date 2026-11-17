import { useId, useState, type InputHTMLAttributes } from 'react'
import styles from './FormField.module.css'

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  name: string
  error?: string
  hint?: string
  /** Adds a button that shows or hides a password. */
  revealable?: boolean
}

export function FormField({ label, error, hint, revealable = false, type, ...inputProps }: FormFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          {...inputProps}
          id={id}
          type={revealable && revealed ? 'text' : type}
          className={`${styles.input} ${error ? styles.invalid : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {revealable && (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setRevealed((value) => !value)}
            aria-pressed={revealed}
            aria-controls={id}
          >
            {revealed ? 'Masquer' : 'Afficher'}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  )
}
