import { toast } from 'sonner'

/**
 * Ações fora do escopo do desafio (páginas editoriais, suporte, login social…).
 * Avisam o usuário em vez de simular um sucesso que não aconteceu.
 */
export function notifyComingSoon(feature: string) {
  toast.info(`${feature} ainda não está disponível nesta versão.`, { id: `coming-soon:${feature}` })
}
