import { useId, useState } from 'react'
import { notifyComingSoon } from '@/lib/coming-soon'

/** Newsletter é auxiliar e fora do escopo: valida o e-mail, mas não simula inscrição. */
export function NewsletterForm() {
  const id = useId()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      noValidate
      className="mt-3"
      onSubmit={(event) => {
        event.preventDefault()
        const input = event.currentTarget.elements.namedItem('email') as HTMLInputElement
        if (!input.validity.valid || !input.value) {
          setError('Informe um e-mail válido.')
          input.focus()
          return
        }
        setError(null)
        notifyComingSoon('A newsletter')
      }}
    >
      <div className="flex">
        <label htmlFor={`${id}-email`} className="sr-only">
          E-mail para receber novidades
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className="h-8 min-w-0 flex-1 rounded-l-sm bg-surface-raised px-2.5 text-body placeholder:text-text-secondary focus-visible:outline-2"
        />
        <button
          type="submit"
          className="h-8 rounded-r-sm bg-primary px-3 text-body-lg font-bold text-ink hover:bg-primary-light"
        >
          Enviar
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-caption text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-3 text-caption text-text-secondary">
          Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
        </p>
      )}
    </form>
  )
}
