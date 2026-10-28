import { cn } from '@/lib/utils'

/** Largura útil do Figma: 1440px de frame com 120px de padding lateral = 1200px. */
export function Container({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-page px-4 md:px-6', className)} {...props} />
}
