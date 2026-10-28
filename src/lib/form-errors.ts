import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toApiError } from './api-error'

/**
 * Aplica no formulário os erros por campo devolvidos pela API e retorna
 * a mensagem geral (ou null quando tudo foi associado a campos).
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  const apiError = toApiError(error)
  let assigned = false
  for (const [field, message] of Object.entries(apiError.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: !assigned })
      assigned = true
    }
  }
  return assigned ? null : apiError.message
}
