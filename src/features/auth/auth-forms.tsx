import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { FacebookIcon, GoogleIcon } from '@/components/brand/social-icons'
import { FormAlert, FormField } from '@/components/form/form-field'
import { PasswordInput } from '@/components/form/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  loginInputSchema,
  registerInputSchema,
  type LoginInput,
  type RegisterInput,
} from '@/contracts/auth'
import { notifyComingSoon } from '@/lib/coming-soon'
import { applyApiErrors } from '@/lib/form-errors'
import { completeAuthentication, safeRedirect } from './session'

function useAuthSuccess(redirect: string | undefined) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return async (response: Awaited<ReturnType<typeof authApi.login>>, message: string) => {
    await completeAuthentication(queryClient, response)
    toast.success(message)
    await navigate({ to: safeRedirect(redirect), replace: true })
  }
}

function SocialButtons() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-caption text-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        Ou continue com
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full border-border font-medium"
        onClick={() => notifyComingSoon('O login com Google')}
      >
        <GoogleIcon className="size-4" /> Continuar com Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full border-border font-medium"
        onClick={() => notifyComingSoon('O login com Facebook')}
      >
        <FacebookIcon className="size-4 text-[#3B5999]" /> Continuar com Facebook
      </Button>
    </div>
  )
}

export function LoginForm({ redirect }: { redirect?: string }) {
  const onSuccess = useAuthSuccess(redirect)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })
  const { errors } = form.formState

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) =>
      onSuccess(response, `Bem-vindo de volta, ${response.user.displayName}!`),
    onError: (error) => setFormError(applyApiErrors(error, form.setError, ['email', 'password'])),
  })

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        login.mutate(values)
      })}
    >
      <FormAlert message={formError} />
      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('email')}
            type="email"
            autoComplete="email"
            placeholder="contato@email.com"
          />
        )}
      </FormField>
      <FormField label="Senha" hideLabel error={errors.password?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('password')}
            autoComplete="current-password"
            placeholder="Senha"
          />
        )}
      </FormField>
      <div className="text-right">
        <button
          type="button"
          className="text-body text-primary hover:underline"
          onClick={() => notifyComingSoon('A recuperação de senha')}
        >
          Esqueceu a senha?
        </button>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
      <SocialButtons />
    </form>
  )
}

export function RegisterForm({ redirect }: { redirect?: string }) {
  const onSuccess = useAuthSuccess(redirect)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    mode: 'onTouched',
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) =>
      onSuccess(response, 'Conta criada! Seu perfil de colecionador está pronto.'),
    onError: (error) =>
      setFormError(
        applyApiErrors(error, form.setError, ['username', 'email', 'password', 'confirmPassword']),
      ),
  })

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        register.mutate(values)
      })}
    >
      <FormAlert message={formError} />
      <FormField label="Nome de usuário" hideLabel error={errors.username?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('username')}
            autoComplete="username"
            placeholder="Nome de usuário"
          />
        )}
      </FormField>
      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('email')}
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
          />
        )}
      </FormField>
      <FormField
        label="Senha"
        hideLabel
        error={errors.password?.message}
        hint="Mínimo de 8 caracteres, com letras e números."
      >
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('password')}
            autoComplete="new-password"
            placeholder="Senha"
          />
        )}
      </FormField>
      <FormField label="Confirmar senha" hideLabel error={errors.confirmPassword?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('confirmPassword')}
            autoComplete="new-password"
            placeholder="Confirmar senha"
          />
        )}
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
        {register.isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>
      <SocialButtons />
    </form>
  )
}
