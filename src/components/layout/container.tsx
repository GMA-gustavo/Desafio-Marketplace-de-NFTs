import { cn } from '@/lib/utils'

/** Largura útil do Figma: 1200 px no desktop; 24 px de recuo lateral nos frames mobile. */
export function Container({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-page px-6', className)} {...props} />
}
