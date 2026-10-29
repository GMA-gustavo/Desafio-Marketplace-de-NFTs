import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormAlert, FormField } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  upsertWalletInputSchema,
  type UpsertWalletInput,
  type Wallet,
  type WalletSlot,
} from '@/contracts/account'
import {
  NETWORK_LABEL,
  networkSchema,
  WALLET_PROVIDER_LABEL,
  walletProviderSchema,
} from '@/contracts/common'
import { useProfile } from '@/features/profile/use-profile'
import { errorMessage } from '@/lib/api-error'
import { applyApiErrors } from '@/lib/form-errors'
import { cn } from '@/lib/utils'
import { useSaveWallet, useWallets } from './use-wallets'

const FIELDS = [
  'displayName',
  'nickname',
  'network',
  'profileName',
  'address',
  'secondaryAddress',
  'provider',
  'referralCode',
  'email',
  'ensName',
] as const

// Campos do Figma (Wallets Form): 40 px, raio de 3 px e placeholder em Color/Secondary.
const selectClass = 'h-10 w-full rounded-[3px] border border-border bg-ink px-3 text-body'
const inputClass = 'h-10 rounded-[3px] placeholder:text-text-muted'

function toInput(wallet: Wallet): UpsertWalletInput {
  return {
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    network: wallet.network,
    profileName: wallet.profileName,
    address: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? '',
    provider: wallet.provider,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensName: wallet.ensName,
  }
}

function WalletForm({
  slot,
  initial,
  onSaved,
}: {
  slot: WalletSlot
  initial: UpsertWalletInput
  onSaved?: () => void
}) {
  const save = useSaveWallet()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<UpsertWalletInput>({
    resolver: zodResolver(upsertWalletInputSchema),
    mode: 'onTouched',
    defaultValues: initial,
  })
  const { errors } = form.formState
  const err = (name: keyof UpsertWalletInput) => errors[name]?.message

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={form.handleSubmit((input) => {
        setFormError(null)
        save.mutate(
          { slot, input },
          {
            onSuccess: () => {
              toast.success(
                slot === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.',
              )
              onSaved?.()
            },
            onError: (error) => setFormError(applyApiErrors(error, form.setError, FIELDS)),
          },
        )
      })}
    >
      <FormAlert message={formError} />
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={err('displayName')}>
          {(c) => <Input {...c} {...form.register('displayName')} className={inputClass} />}
        </FormField>
        <FormField label="Apelido da carteira" required error={err('nickname')}>
          {(c) => <Input {...c} {...form.register('nickname')} className={inputClass} />}
        </FormField>
        <FormField label="Rede" required error={err('network')}>
          {(c) => (
            <select {...c} {...form.register('network')} className={selectClass}>
              {networkSchema.options.map((n) => (
                <option key={n} value={n}>
                  {NETWORK_LABEL[n]}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Nome do perfil" required error={err('profileName')}>
          {(c) => <Input {...c} {...form.register('profileName')} className={inputClass} />}
        </FormField>
        <FormField label="Endereço da carteira" required error={err('address')}>
          {(c) => (
            <Input
              {...c}
              {...form.register('address')}
              placeholder="Endereço 0x da carteira"
              spellCheck={false}
              className={inputClass}
            />
          )}
        </FormField>
        {/* Sem rótulo visível no Figma: só o placeholder, alinhado ao endereço. */}
        <FormField
          label="ENS ou carteira secundária (opcional)"
          hideLabel
          error={err('secondaryAddress')}
          className="md:pt-[29px]"
        >
          {(c) => (
            <Input
              {...c}
              {...form.register('secondaryAddress')}
              placeholder="ENS ou carteira secundária (opcional)"
              spellCheck={false}
              className={inputClass}
            />
          )}
        </FormField>
        <FormField label="Tipo de carteira" required error={err('provider')}>
          {(c) => (
            <select {...c} {...form.register('provider')} className={selectClass}>
              {walletProviderSchema.options.map((p) => (
                <option key={p} value={p}>
                  {WALLET_PROVIDER_LABEL[p]}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Código de indicação" required error={err('referralCode')}>
          {(c) => <Input {...c} {...form.register('referralCode')} className={inputClass} />}
        </FormField>
        <FormField label="E-mail" required error={err('email')}>
          {(c) => (
            <Input
              {...c}
              {...form.register('email')}
              type="email"
              autoComplete="email"
              className={inputClass}
            />
          )}
        </FormField>
        <FormField label="Nome ENS" required error={err('ensName')}>
          {(c) => (
            <div className="flex items-center">
              <Input
                {...c}
                {...form.register('ensName')}
                className={cn(inputClass, 'rounded-r-none')}
              />
              <span className="grid h-10 place-items-center rounded-r-[3px] border border-l-0 border-border px-3 text-[15px] text-foreground">
                .eth
              </span>
            </div>
          )}
        </FormField>
      </div>
      <Button
        type="submit"
        disabled={save.isPending}
        className="h-10 w-[131px] rounded-[3px] leading-4"
      >
        {save.isPending ? 'Salvando…' : 'Salvar carteira'}
      </Button>
    </form>
  )
}

export function WalletsPage() {
  const wallets = useWallets()
  const profile = useProfile()
  const [addingSecondary, setAddingSecondary] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)

  if (wallets.isPending || profile.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only" role="status">
          Carregando carteiras…
        </span>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }
  if (wallets.isError) {
    return (
      <div role="alert" className="space-y-3">
        <p className="text-destructive">{errorMessage(wallets.error)}</p>
        <Button variant="outline" onClick={() => void wallets.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const primary = wallets.data.primary
  const secondary = wallets.data.secondary
  const blank: UpsertWalletInput = {
    displayName: profile.data?.displayName ?? '',
    nickname: 'Principal',
    network: 'ethereum',
    profileName: profile.data?.username ?? '',
    address: '',
    secondaryAddress: '',
    provider: 'metamask',
    referralCode: '',
    email: profile.data?.email ?? '',
    ensName: profile.data?.ensName ?? '',
  }
  const secondaryInitial: UpsertWalletInput = secondary
    ? toInput(secondary)
    : sameAsPrimary && primary
      ? { ...toInput(primary), nickname: 'Reserva' }
      : { ...blank, nickname: 'Reserva' }

  return (
    <div className="space-y-8">
      <section aria-labelledby="principal-title" className="space-y-8">
        <div>
          <h1 id="principal-title" className="text-[17px] leading-4 font-bold">
            Carteira principal
          </h1>
          <p className="mt-2 text-body leading-[15px] text-text-secondary">
            Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
          </p>
        </div>
        <WalletForm
          key={primary?.updatedAt ?? 'new'}
          slot="primary"
          initial={primary ? toInput(primary) : blank}
        />
      </section>

      <section aria-labelledby="secundaria-title" className="space-y-8">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="secundaria-title" className="text-[17px] leading-4 font-bold">
              Carteira secundária
            </h2>
            {!secondary && !addingSecondary && (
              <div className="flex items-center gap-8">
                <label className="flex items-center gap-2 text-body leading-4">
                  <input
                    type="checkbox"
                    checked={sameAsPrimary}
                    disabled={!primary}
                    onChange={(e) => setSameAsPrimary(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  Igual à carteira principal
                </label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-body-lg leading-4 font-medium text-text-accent"
                  onClick={() => setAddingSecondary(true)}
                >
                  Adicionar
                </Button>
              </div>
            )}
          </div>
          {!secondary && !addingSecondary && (
            <p className="mt-3 text-body leading-[15px] text-text-secondary">
              Você ainda não adicionou uma carteira secundária.
            </p>
          )}
        </div>
        {(secondary || addingSecondary) && (
          <WalletForm
            key={`${secondary?.updatedAt ?? 'new'}-${sameAsPrimary}`}
            slot="secondary"
            initial={secondaryInitial}
            onSaved={() => setAddingSecondary(false)}
          />
        )}
      </section>
    </div>
  )
}
