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
  /** Esconde a dica visualmente (o frame não tem texto de apoio); continua ligada ao campo. */
  hideHint?: boolean
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
  hideHint,
  className,
  children,
}: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Rótulo do Figma: 15/15 numa linha de 29 px, definida pelo asterisco de 22 px. */}
      <label
        htmlFor={id}
        className={cn(
          'flex min-h-[29px] items-start text-[15px] leading-[15px] text-foreground',
          hideLabel && 'sr-only',
        )}
      >
        {label}
        {required && (
          <span aria-hidden className="-mt-0.5 ml-0.5 text-[22px] leading-[22px] text-coral">
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
        <p
          id={hintId}
          className={cn('mt-1.5 text-caption text-text-secondary', hideHint && 'sr-only')}
        >
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-caption text-destructive">
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
