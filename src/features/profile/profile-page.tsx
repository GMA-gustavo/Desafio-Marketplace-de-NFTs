import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImageIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { accountApi } from '@/api/account'
import { queryKeys } from '@/api/query-keys'
import { FormAlert, FormField } from '@/components/form/form-field'
import { PasswordInput } from '@/components/form/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  changePasswordInputSchema,
  MAX_AVATAR_BYTES,
  updateProfileInputSchema,
  type Profile,
} from '@/contracts/account'
import type { User } from '@/contracts/auth'
import { useSession } from '@/features/auth/session'
import { errorMessage, toApiError } from '@/lib/api-error'
import { applyApiErrors } from '@/lib/form-errors'
import { useProfile } from './use-profile'

/** Senha é opcional no mesmo formulário: só é validada se algum dos três campos for preenchido. */
const profileFormSchema = updateProfileInputSchema
  .extend({ currentPassword: z.string(), newPassword: z.string(), confirmPassword: z.string() })
  .superRefine((values, ctx) => {
    if (!values.currentPassword && !values.newPassword && !values.confirmPassword) return
    const result = changePasswordInputSchema.safeParse(values)
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message })
      }
    }
  })
type ProfileForm = z.infer<typeof profileFormSchema>

const PROFILE_FIELDS = ['displayName', 'username', 'email', 'ensName', 'walletNickname'] as const
const PASSWORD_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const

function useSyncProfile() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return (profile: Profile) => {
    queryClient.setQueryData(queryKeys.profile(user!.id), profile)
    // Nome/avatar também aparecem no header: atualiza a sessão em cache.
    queryClient.setQueryData<User | null>(queryKeys.session, (old) =>
      old
        ? {
            ...old,
            displayName: profile.displayName,
            username: profile.username,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
          }
        : old,
    )
  }
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

function AvatarEditor({ profile }: { profile: Profile }) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const sync = useSyncProfile()
  const [error, setError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: accountApi.updateAvatar,
    onSuccess: (p) => {
      sync(p)
      toast.success('Avatar atualizado.')
    },
    onError: (e) => setError(toApiError(e).fieldErrors.avatar ?? errorMessage(e)),
  })
  const remove = useMutation({
    mutationFn: accountApi.removeAvatar,
    onSuccess: (p) => {
      sync(p)
      toast.success('Avatar removido.')
    },
    onError: (e) => setError(errorMessage(e)),
  })
  const busy = upload.isPending || remove.isPending

  return (
    <div>
      <p id={`${id}-label`} className="text-body">
        Avatar
      </p>
      <div className="mt-2 flex items-center gap-4">
        <span className="grid size-11 place-items-center overflow-hidden rounded-full bg-surface-raised text-primary">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Seu avatar atual"
              width={44}
              height={44}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-5" aria-label="Sem avatar" />
          )}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          tabIndex={-1}
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            setError(null)
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
              return setError('Use uma imagem PNG, JPG ou WebP.')
            }
            if (file.size > MAX_AVATAR_BYTES) return setError('A imagem deve ter no máximo 512 KB.')
            upload.mutate(await readAsDataUrl(file))
          }}
        />
        <Button type="button" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {upload.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        <button
          type="button"
          disabled={busy || !profile.avatarUrl}
          onClick={() => remove.mutate()}
          className="text-body hover:text-primary disabled:opacity-50"
        >
          Remover
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-caption text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-2 text-caption text-text-secondary">
          PNG, JPG ou WebP com até 512 KB.
        </p>
      )}
    </div>
  )
}

function ProfileForm({ profile }: { profile: Profile }) {
  const sync = useSyncProfile()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onTouched',
    defaultValues: { ...profile, currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors, isSubmitting } = form.formState

  useEffect(() => {
    form.reset(
      { ...profile, currentPassword: '', newPassword: '', confirmPassword: '' },
      { keepDirtyValues: true },
    )
  }, [profile, form])

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const { currentPassword, newPassword, confirmPassword, ...data } = values
    const profileDirty = PROFILE_FIELDS.some((f) => form.getFieldState(f).isDirty)
    try {
      if (profileDirty) sync(await accountApi.updateProfile(data))
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, PROFILE_FIELDS))
      return
    }
    if (currentPassword || newPassword) {
      try {
        await accountApi.changePassword({ currentPassword, newPassword, confirmPassword })
        form.resetField('currentPassword', { defaultValue: '' })
        form.resetField('newPassword', { defaultValue: '' })
        form.resetField('confirmPassword', { defaultValue: '' })
      } catch (error) {
        setFormError(applyApiErrors(error, form.setError, PASSWORD_FIELDS))
        if (profileDirty) toast.success('Dados do perfil salvos. A senha não foi alterada.')
        return
      }
    }
    if (!profileDirty && !currentPassword) {
      toast.info('Nenhuma alteração para salvar.')
      return
    }
    form.reset({ ...form.getValues(), currentPassword: '', newPassword: '', confirmPassword: '' })
    toast.success(currentPassword ? 'Perfil e senha atualizados.' : 'Perfil atualizado.')
  })

  const err = (name: keyof ProfileForm) => errors[name]?.message

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      <FormAlert message={formError} />
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={err('displayName')}>
          {(c) => <Input {...c} {...form.register('displayName')} autoComplete="name" />}
        </FormField>
        <FormField label="Nome de usuário" required error={err('username')}>
          {(c) => <Input {...c} {...form.register('username')} autoComplete="username" />}
        </FormField>
        <FormField label="E-mail" required error={err('email')}>
          {(c) => <Input {...c} {...form.register('email')} type="email" autoComplete="email" />}
        </FormField>
        <FormField label="Nome ENS" required error={err('ensName')} hint="Sem o sufixo .eth">
          {(c) => (
            <div className="flex items-center">
              <Input {...c} {...form.register('ensName')} className="rounded-r-none" />
              <span className="grid h-10 place-items-center rounded-r-sm border border-l-0 border-border px-3 text-body text-text-secondary">
                .eth
              </span>
            </div>
          )}
        </FormField>
        <FormField label="Apelido da carteira" required error={err('walletNickname')}>
          {(c) => <Input {...c} {...form.register('walletNickname')} />}
        </FormField>
        <AvatarEditor profile={profile} />
      </div>

      <fieldset className="max-w-md space-y-4">
        <legend className="text-body-lg font-bold">Alterar senha</legend>
        <p className="text-caption text-text-secondary">
          Preencha apenas se quiser trocar a senha. As outras sessões serão encerradas.
        </p>
        <FormField label="Senha atual" error={err('currentPassword')}>
          {(c) => (
            <PasswordInput
              {...c}
              {...form.register('currentPassword')}
              autoComplete="current-password"
            />
          )}
        </FormField>
        <FormField
          label="Nova senha"
          error={err('newPassword')}
          hint="Mínimo de 8 caracteres, com letras e números."
        >
          {(c) => (
            <PasswordInput {...c} {...form.register('newPassword')} autoComplete="new-password" />
          )}
        </FormField>
        <FormField label="Confirmar nova senha" error={err('confirmPassword')}>
          {(c) => (
            <PasswordInput
              {...c}
              {...form.register('confirmPassword')}
              autoComplete="new-password"
            />
          )}
        </FormField>
      </fieldset>

      <Button type="submit" disabled={isSubmitting} className="min-w-27">
        {isSubmitting ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

export function ProfilePage() {
  const profile = useProfile()
  return (
    <section aria-labelledby="perfil-title" className="space-y-5">
      <h1 id="perfil-title" className="text-title font-bold">
        Perfil do colecionador
      </h1>
      {profile.isPending ? (
        <div className="grid gap-5 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : profile.isError ? (
        <div role="alert" className="space-y-3">
          <p className="text-destructive">{errorMessage(profile.error)}</p>
          <Button variant="outline" onClick={() => void profile.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <ProfileForm profile={profile.data} />
      )}
    </section>
  )
}
