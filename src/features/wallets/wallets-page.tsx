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

const selectClass = 'h-10 w-full rounded-sm border border-border bg-ink px-3 text-body'

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
      className="space-y-5"
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
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={err('displayName')}>
          {(c) => <Input {...c} {...form.register('displayName')} />}
        </FormField>
        <FormField label="Apelido da carteira" required error={err('nickname')}>
          {(c) => <Input {...c} {...form.register('nickname')} />}
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
          {(c) => <Input {...c} {...form.register('profileName')} />}
        </FormField>
        <FormField label="Endereço da carteira" required error={err('address')}>
          {(c) => (
            <Input
              {...c}
              {...form.register('address')}
              placeholder="Endereço 0x da carteira"
              spellCheck={false}
            />
          )}
        </FormField>
        <FormField label="ENS ou carteira secundária (opcional)" error={err('secondaryAddress')}>
          {(c) => (
            <Input
              {...c}
              {...form.register('secondaryAddress')}
              placeholder="nome.eth ou 0x…"
              spellCheck={false}
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
          {(c) => <Input {...c} {...form.register('referralCode')} />}
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
      </div>
      <Button type="submit" disabled={save.isPending}>
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
    <div className="space-y-12">
      <section aria-labelledby="principal-title" className="space-y-4">
        <div>
          <h1 id="principal-title" className="text-title font-bold">
            Carteira principal
          </h1>
          <p className="text-caption text-text-secondary">
            Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
          </p>
        </div>
        <WalletForm
          key={primary?.updatedAt ?? 'new'}
          slot="primary"
          initial={primary ? toInput(primary) : blank}
        />
      </section>

      <section aria-labelledby="secundaria-title" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="secundaria-title" className="text-title font-bold">
              Carteira secundária
            </h2>
            {!secondary && !addingSecondary && (
              <p className="text-caption text-text-secondary">
                Você ainda não adicionou uma carteira secundária.
              </p>
            )}
          </div>
          {!secondary && !addingSecondary && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-body">
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
                className="px-0 text-body-lg"
                onClick={() => setAddingSecondary(true)}
              >
                Adicionar
              </Button>
            </div>
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
