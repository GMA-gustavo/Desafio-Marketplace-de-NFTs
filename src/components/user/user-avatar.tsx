import { cn } from '@/lib/utils'

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string
  src: string | null
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-dark text-caption font-bold text-primary',
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" width={64} height={64} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  )
}
