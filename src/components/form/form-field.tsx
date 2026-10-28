import { useId } from 'react'
import { cn } from '@/lib/utils'

export interface ControlProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
  'aria-required'?: true
}

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  /** Esconde o label visualmente (ex.: layout com placeholder), mantendo-o acessível. */
  hideLabel?: boolean
  className?: string
  children: (control: ControlProps) => React.ReactNode
}

/** Label + controle + dica/erro, com aria-invalid e aria-describedby ligados ao campo. */
export function FormField({
  label,
  error,
  hint,
  required,
  hideLabel,
  className,
  children,
}: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-body text-foreground', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-coral">
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-caption text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Alerta de erro geral do formulário (anunciado por leitores de tela). */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-body text-destructive"
    >
      {message}
    </p>
  )
}
