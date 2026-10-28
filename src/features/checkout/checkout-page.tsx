import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { cartApi } from '@/api/cart'
import { queryKeys } from '@/api/query-keys'
import { FormAlert, FormField } from '@/components/form/form-field'
import { Container } from '@/components/layout/container'
import { Breadcrumb, MobileTopBar } from '@/components/layout/page-chrome'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { WALLET_PROVIDER_LABEL, NETWORK_LABEL, networkSchema } from '@/contracts/common'
import type { Quote } from '@/contracts/cart'
import { buyerInfoSchema, type CreateOrderInput } from '@/contracts/order'
import { useSession } from '@/features/auth/session'
import { CouponForm, QuoteSummary } from '@/features/cart/cart-summary'
import { useCart } from '@/features/cart/use-cart'
import { useQuote } from '@/features/cart/use-cart-mutations'
import { useProfile } from '@/features/profile/use-profile'
import { useWalletConnections, useWallets, walletList } from '@/features/wallets/use-wallets'
import { errorMessage, toApiError } from '@/lib/api-error'
import { storage } from '@/lib/storage'
import { ReviewDialog, QuoteChangedDialog } from './checkout-dialogs'
import { OrderLines } from './order-lines'
import { createAttempt, quoteFromConflict, usePlaceOrder } from './use-place-order'
import { WalletPicker } from './wallet-picker'

const checkoutFormSchema = buyerInfoSchema.extend({
  network: networkSchema,
  note: z.string().max(280, 'Máximo de 280 caracteres.'),
})
type CheckoutForm = z.infer<typeof checkoutFormSchema>

const EMPTY: CheckoutForm = {
  displayName: '',
  username: '',
  profileName: '',
  email: '',
  referralCode: '',
  ensName: '',
  note: '',
  network: 'ethereum',
}

export function CheckoutPage() {
  const { user } = useSession()
  const userId = user!.id
  const queryClient = useQueryClient()
  const cart = useCart()
  const profile = useProfile()
  const wallets = useWallets()
  const connections = useWalletConnections()
  const list = walletList(wallets.data)
  const placeOrder = usePlaceOrder()

  const [draft] = useState(() => {
    const saved = storage.getCheckoutDraft()
    return saved?.userId === userId ? saved : null
  })
  const [chosenWalletId, setWalletId] = useState<string | null>(draft?.walletId ?? null)
  const [formError, setFormError] = useState<string | null>(null)
  const [showCoupon, setShowCoupon] = useState(false)
  const [review, setReview] = useState<{ quote: Quote; body: CreateOrderInput } | null>(null)
  const [changes, setChanges] = useState<{ previous: Quote; next: Quote } | null>(null)
  const [isPreparing, setPreparing] = useState(false)
  const [isAccepting, setAccepting] = useState(false)
  const submitting = useRef(false)

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutFormSchema),
    // Valida no envio (e depois a cada digitação): erros no blur deslocam o botão e fazem o toque
    // no mobile cair fora dele.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { ...EMPTY, ...(draft?.values as Partial<CheckoutForm> | undefined) },
  })
  const { errors } = form.formState
  const network = useWatch({ control: form.control, name: 'network' })
  const items = cart.data?.items ?? []
  const quote = useQuote(network, items.length > 0)
  // Sem escolha explícita, usa a primeira carteira cadastrada (a principal).
  const walletId = list.some((w) => w.id === chosenWalletId)
    ? chosenWalletId
    : (list[0]?.id ?? null)
  const selectedWallet = list.find((w) => w.id === walletId)
  const connected = connections.data?.some(
    (c) => c.walletId === walletId && c.status === 'connected',
  )

  // Pré-preenche com perfil + carteira principal quando não há rascunho salvo.
  const prefilled = useRef(Boolean(draft))
  useEffect(() => {
    if (prefilled.current || !profile.data || !wallets.isSuccess) return
    prefilled.current = true
    const primary = wallets.data.primary ?? list[0]
    form.reset({
      ...EMPTY,
      displayName: profile.data.displayName,
      username: profile.data.username,
      email: profile.data.email,
      ensName: profile.data.ensName,
      profileName: primary?.profileName ?? profile.data.username,
      referralCode: primary?.referralCode ?? '',
      network: primary?.network ?? 'ethereum',
    })
  }, [profile.data, wallets.isSuccess, wallets.data, list, form])

  // Rascunho persistido: sobrevive a refresh e à expiração da sessão.
  useEffect(() => {
    storage.setCheckoutDraft({ userId, values: form.getValues(), walletId })
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => storage.setCheckoutDraft({ userId, values, walletId }),
    })
  }, [form, userId, walletId])

  // Tentativa interrompida (refresh/queda/sessão expirada no envio): retoma com a mesma chave.
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current) return
    resumed.current = true
    const attempt = storage.getCheckoutAttempt()
    if (attempt && attempt.userId === userId) placeOrder.mutate(attempt)
  }, [placeOrder, userId])

  const toBody = (values: CheckoutForm, quoteId: string, wallet: string): CreateOrderInput => {
    const { network: orderNetwork, note, ...buyer } = values
    return {
      quoteId,
      walletId: wallet,
      network: orderNetwork,
      buyer: { ...buyer, note: note || undefined },
    }
  }

  const openReview = form.handleSubmit(
    async (values) => {
      setFormError(null)
      placeOrder.reset()
      if (!selectedWallet)
        return setFormError('Escolha uma carteira cadastrada para receber os NFTs.')
      if (!connected)
        return setFormError('Conecte a carteira selecionada antes de revisar a compra.')
      setPreparing(true)
      try {
        // Cotação nova a cada revisão: é ela que o servidor exige para confirmar.
        const fresh = await queryClient.fetchQuery({
          queryKey: queryKeys.quote(userId, values.network),
          queryFn: ({ signal }) => cartApi.quote(values.network, signal),
          staleTime: 0,
        })
        if (!fresh.valid) {
          return setFormError(
            'Alguns itens ficaram indisponíveis. Ajuste o carrinho para continuar.',
          )
        }
        setReview({ quote: fresh, body: toBody(values, fresh.id, selectedWallet.id) })
      } catch (error) {
        setFormError(errorMessage(error))
      } finally {
        setPreparing(false)
      }
    },
    () => setFormError('Revise os campos destacados.'),
  )

  const confirm = () => {
    // Trava síncrona: cliques no mesmo tick chegam antes do botão ser desabilitado.
    if (!review || submitting.current) return
    submitting.current = true
    const pending = storage.getCheckoutAttempt()
    // Reenvio após falha transitória reaproveita a tentativa (mesma chave); senão, nova tentativa.
    const attempt =
      pending && pending.userId === userId && pending.body.quoteId === review.body.quoteId
        ? pending
        : createAttempt(userId, review.body)
    // Persistida antes do envio: qualquer reenvio (clique, refresh, timeout) usa a mesma chave.
    storage.setCheckoutAttempt(attempt)
    placeOrder.mutate(attempt, {
      onSettled: () => {
        submitting.current = false
      },
      onError: (error) => {
        const next = quoteFromConflict(error)
        if (next) {
          setChanges({ previous: review.quote, next })
          setReview(null)
        }
      },
    })
  }

  /** O usuário viu os novos valores: zera os avisos de preço e reabre a revisão com a nova cotação. */
  const acceptChanges = async () => {
    if (!changes || !walletId) return
    setAccepting(true)
    await cartApi.acknowledge().catch(() => undefined)
    placeOrder.reset()
    setReview({ quote: changes.next, body: toBody(form.getValues(), changes.next.id, walletId) })
    setChanges(null)
    setAccepting(false)
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
  }

  const submitError =
    placeOrder.isError && !quoteFromConflict(placeOrder.error)
      ? toApiError(placeOrder.error).isTransient
        ? 'Não conseguimos confirmar se o pedido foi criado. Tente novamente — a mesma tentativa será usada, sem cobrança duplicada.'
        : errorMessage(placeOrder.error)
      : null

  if (cart.isSuccess && items.length === 0 && !placeOrder.isPending && !placeOrder.isSuccess) {
    return (
      <Container className="grid min-h-[50dvh] place-items-center py-16 text-center">
        <div>
          <h1 className="text-heading font-bold">Seu carrinho está vazio</h1>
          <p className="mt-2 text-text-secondary">
            Adicione NFTs ao carrinho para finalizar uma compra.
          </p>
          <Link to="/" hash="catalogo" className={buttonVariants({ className: 'mt-6' })}>
            Explorar NFTs
          </Link>
        </div>
      </Container>
    )
  }

  const loadingForm = profile.isPending || wallets.isPending
  // Revisar só com o formulário montado: antes disso a validação veria os campos vazios.
  const canReview =
    !loadingForm &&
    !isPreparing &&
    !placeOrder.isPending &&
    Boolean(quote.data && quote.data.lines.length > 0)
  const field = (name: keyof CheckoutForm) => errors[name]?.message

  const formFields = loadingForm ? (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  ) : (
    <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
      <FormField label="Nome de exibição" required error={field('displayName')}>
        {(c) => <Input {...c} {...form.register('displayName')} autoComplete="name" />}
      </FormField>
      <FormField label="Nome de usuário" required error={field('username')}>
        {(c) => <Input {...c} {...form.register('username')} autoComplete="username" />}
      </FormField>
      <FormField label="Rede" required error={field('network')}>
        {(c) => (
          <select
            {...c}
            {...form.register('network')}
            className="h-10 rounded-sm border border-border bg-ink px-3 text-body"
          >
            {networkSchema.options.map((n) => (
              <option key={n} value={n}>
                {NETWORK_LABEL[n]}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <FormField label="Nome do perfil" required error={field('profileName')}>
        {(c) => <Input {...c} {...form.register('profileName')} />}
      </FormField>
      <FormField label="Endereço da carteira" hint="Definido pela carteira selecionada.">
        {(c) => (
          <Input
            {...c}
            value={selectedWallet?.address ?? ''}
            readOnly
            placeholder="Endereço 0x da carteira"
          />
        )}
      </FormField>
      <FormField label="ENS ou carteira secundária (opcional)">
        {(c) => (
          <Input {...c} value={selectedWallet?.secondaryAddress ?? ''} readOnly placeholder="—" />
        )}
      </FormField>
      <FormField label="Tipo de carteira">
        {(c) => (
          <Input
            {...c}
            value={selectedWallet ? WALLET_PROVIDER_LABEL[selectedWallet.provider] : ''}
            readOnly
            placeholder="Selecione uma carteira"
          />
        )}
      </FormField>
      <FormField label="Código de indicação" required error={field('referralCode')}>
        {(c) => <Input {...c} {...form.register('referralCode')} />}
      </FormField>
      <FormField label="E-mail" required error={field('email')}>
        {(c) => <Input {...c} {...form.register('email')} type="email" autoComplete="email" />}
      </FormField>
      <FormField label="Nome ENS" required error={field('ensName')} hint="Sem o sufixo .eth">
        {(c) => (
          <div className="flex items-center">
            <Input {...c} {...form.register('ensName')} className="rounded-r-none" />
            <span className="grid h-10 place-items-center rounded-r-sm border border-l-0 border-border px-3 text-body text-text-secondary">
              .eth
            </span>
          </div>
        )}
      </FormField>
      <FormField
        label="Observação do colecionador (opcional)"
        error={field('note')}
        className="md:col-span-2"
      >
        {(c) => <Textarea {...c} {...form.register('note')} rows={4} className="max-w-md" />}
      </FormField>
    </div>
  )

  return (
    <Container className="pb-12 md:pt-6">
      <MobileTopBar title="Pagamento com carteira" fallback="/carrinho" />
      <Breadcrumb
        className="hidden md:block"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Mercado', to: '/' },
          { label: 'Pagamento' },
        ]}
      />
      <h1 className="hidden md:sr-only md:block">Pagamento</h1>

      <form
        noValidate
        onSubmit={openReview}
        className="mt-4 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-7"
      >
        <section aria-labelledby="perfil-colecionador" className="order-2 space-y-4 lg:order-1">
          <h2 id="perfil-colecionador" className="text-title font-bold">
            Perfil do colecionador
          </h2>
          <FormAlert message={formError} />
          {formFields}
        </section>

        <aside aria-label="Resumo e carteira" className="order-1 space-y-5 lg:order-2">
          <section aria-labelledby="seus-nfts" className="hidden md:block">
            <div className="flex justify-between border-b border-border pb-2">
              <h2 id="seus-nfts" className="text-title font-bold">
                Seus NFTs
              </h2>
              <span className="text-body-lg font-bold">Subtotal</span>
            </div>
            <div className="mt-2">
              {quote.data ? (
                <OrderLines lines={quote.data.lines} />
              ) : (
                <Skeleton className="h-36 w-full" />
              )}
            </div>
          </section>

          <div className="hidden md:block">
            {showCoupon || cart.data?.couponCode ? (
              <CouponForm couponCode={cart.data?.couponCode ?? null} quote={quote.data} />
            ) : (
              <button
                type="button"
                onClick={() => setShowCoupon(true)}
                className="w-full text-center text-body hover:text-primary"
              >
                Tem um código promocional? <span className="underline">Aplique aqui</span>
              </button>
            )}
          </div>

          <div className="hidden md:block">
            <QuoteSummary quote={quote.data} isLoading={quote.isPending} />
          </div>

          <section aria-labelledby="carteira-rede" className="space-y-3">
            <h2 id="carteira-rede" className="text-title font-bold md:text-center">
              Carteira e rede
            </h2>
            <WalletPicker
              wallets={list}
              isLoading={wallets.isPending}
              selectedId={walletId}
              onSelect={setWalletId}
              network={network}
            />
          </section>

          <div className="md:hidden">
            <QuoteSummary quote={quote.data} isLoading={quote.isPending} />
          </div>

          <Button type="submit" size="lg" className="hidden w-full lg:flex" disabled={!canReview}>
            {isPreparing ? 'Atualizando valores…' : 'Revisar e confirmar compra'}
          </Button>
        </aside>

        <Button
          type="submit"
          size="lg"
          className="order-3 w-full rounded-full lg:hidden"
          disabled={!canReview}
        >
          {isPreparing ? 'Atualizando valores…' : 'Revisar e confirmar compra'}
        </Button>
      </form>

      {placeOrder.isPending && !review && (
        <p role="status" className="mt-6 text-center text-body text-text-secondary">
          Retomando a confirmação da sua compra…
        </p>
      )}

      {review && (
        <ReviewDialog
          open
          quote={review.quote}
          body={review.body}
          wallet={selectedWallet}
          isSubmitting={placeOrder.isPending}
          retryCount={placeOrder.failureCount}
          error={submitError}
          onConfirm={confirm}
          onClose={() => {
            setReview(null)
            placeOrder.reset()
          }}
        />
      )}
      {changes && (
        <QuoteChangedDialog
          previous={changes.previous}
          next={changes.next}
          isAccepting={isAccepting}
          onAccept={() => void acceptChanges()}
          onClose={() => setChanges(null)}
        />
      )}
    </Container>
  )
}
