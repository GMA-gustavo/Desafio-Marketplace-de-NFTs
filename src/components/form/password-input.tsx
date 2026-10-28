import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function PasswordInput({ className, ...props }: React.ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-10', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-text-secondary hover:text-primary"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  )
}
