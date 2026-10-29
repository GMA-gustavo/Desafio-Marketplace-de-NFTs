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
import { cn } from '@/lib/utils'
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

// Social Button do Figma: 40 px, raio de 5 px, ícone de 20 px e texto de 13 px.
const socialButton =
  'h-10 w-full gap-3 rounded-[5px] border-border text-[13px] leading-4 font-medium text-text-secondary'

function SocialButtons({ dialog }: { dialog?: boolean }) {
  return (
    <div className={cn('space-y-3', dialog ? 'pt-6' : 'pt-10')}>
      {/* No modal desktop as linhas do divisor vão de borda a borda (fora do recuo de 80 px). */}
      <div
        className={cn(
          'flex items-center gap-3 text-[13px] leading-4 text-foreground',
          dialog && 'md:-mx-20',
        )}
        aria-hidden
      >
        <span className="h-px flex-1 bg-border" />
        Ou continue com
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className={socialButton}
        onClick={() => notifyComingSoon('O login com Google')}
      >
        <GoogleIcon className="size-5" /> Continuar com Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className={socialButton}
        onClick={() => notifyComingSoon('O login com Facebook')}
      >
        <FacebookIcon className="size-5 text-[#3B5999]" /> Continuar com Facebook
      </Button>
    </div>
  )
}

// Inputs dos modais de autenticação: 40 px, raio de 5 px e 16 px de recuo.
// Mobile (telas cheias): campos de 50 px e botão de 60 px com raio de 10 px, 40 px entre os blocos.
const authInput = (dialog?: boolean) =>
  cn('px-4 placeholder:text-text-muted', dialog ? 'h-10 rounded-[5px]' : 'h-[50px] rounded-[10px]')
const submitButton = (dialog?: boolean) =>
  cn(
    'w-full text-body-lg leading-4 font-bold',
    dialog ? 'mt-6 h-[45px] rounded-[5px]' : 'mt-10 h-[60px] rounded-[10px]',
  )

export function LoginForm({ redirect, dialog }: { redirect?: string; dialog?: boolean }) {
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
      className="space-y-3"
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
            className={authInput(dialog)}
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
            className={authInput(dialog)}
          />
        )}
      </FormField>
      <div>
        <button
          type="button"
          className="text-body leading-4 text-text-accent hover:underline"
          onClick={() => notifyComingSoon('A recuperação de senha')}
        >
          Esqueceu a senha?
        </button>
      </div>
      <Button type="submit" size="lg" className={submitButton(dialog)} disabled={login.isPending}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
      <SocialButtons dialog={dialog} />
    </form>
  )
}

export function RegisterForm({ redirect, dialog }: { redirect?: string; dialog?: boolean }) {
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
      className="space-y-3"
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
            className={authInput(dialog)}
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
            className={authInput(dialog)}
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
            className={authInput(dialog)}
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
            className={authInput(dialog)}
          />
        )}
      </FormField>
      <Button
        type="submit"
        size="lg"
        className={submitButton(dialog)}
        disabled={register.isPending}
      >
        {register.isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>
      <SocialButtons dialog={dialog} />
    </form>
  )
}
