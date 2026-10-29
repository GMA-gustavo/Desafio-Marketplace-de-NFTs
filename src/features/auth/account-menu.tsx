import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { ChevronDown, Heart, LogOut, User, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/user/user-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User as UserDto } from '@/contracts/auth'
import { logout } from './session'

export function AccountMenu({ user }: { user: UserDto }) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta de ${user.displayName}`}
        className="flex items-center gap-2 rounded-sm px-1 py-0.5 hover:text-primary"
      >
        <UserAvatar name={user.displayName} src={user.avatarUrl} />
        <span className="hidden max-w-32 truncate lg:inline">{user.displayName}</span>
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {/* GroupLabel do Base UI só existe dentro de um Menu.Group (erro #31 fora dele). */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block font-bold text-foreground">{user.displayName}</span>
            <span className="block text-caption text-text-secondary">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/perfil" />}>
          <User aria-hidden /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/perfil/carteiras" />}>
          <Wallet aria-hidden /> Carteiras
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/favoritos" />}>
          <Heart aria-hidden /> Lista de interesse
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await logout(queryClient)
            toast.success('Você saiu da sua conta.')
            await router.navigate({ to: '/' })
          }}
        >
          <LogOut aria-hidden /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
