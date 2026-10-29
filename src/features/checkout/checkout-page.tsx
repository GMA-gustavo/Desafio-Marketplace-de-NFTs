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
import { cn } from '@/lib/utils'
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

  // Campos do Figma: 40 px de altura, raio de 3 px e placeholder em Color/Secondary.
  const control = 'h-10 rounded-[3px] placeholder:text-text-muted'
  const otherWallet = list.find((w) => w.id !== list[0]?.id)

  const formFields = loadingForm ? (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  ) : (
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
      <FormField label="Nome de exibição" required error={field('displayName')}>
        {(c) => (
          <Input {...c} {...form.register('displayName')} autoComplete="name" className={control} />
        )}
      </FormField>
      <FormField label="Nome de usuário" required error={field('username')}>
        {(c) => (
          <Input
            {...c}
            {...form.register('username')}
            autoComplete="username"
            className={control}
          />
        )}
      </FormField>
      <FormField label="Rede" required error={field('network')}>
        {(c) => (
          <select
            {...c}
            {...form.register('network')}
            className="h-10 rounded-[3px] border border-border bg-ink px-3 text-body"
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
        {(c) => <Input {...c} {...form.register('profileName')} className={control} />}
      </FormField>
      <FormField label="Endereço da carteira">
        {(c) => (
          <Input
            {...c}
            value={selectedWallet?.address ?? ''}
            readOnly
            placeholder="Endereço 0x da carteira"
            className={control}
          />
        )}
      </FormField>
      {/* No Figma este campo não tem rótulo visível: só o placeholder, alinhado ao endereço. */}
      <FormField label="ENS ou carteira secundária (opcional)" hideLabel className="md:pt-[29px]">
        {(c) => (
          <Input
            {...c}
            value={selectedWallet?.secondaryAddress ?? ''}
            readOnly
            placeholder="ENS ou carteira secundária (opcional)"
            className={control}
          />
        )}
      </FormField>
      <FormField label="Tipo de carteira">
        {(c) => (
          <Input
            {...c}
            value={selectedWallet ? WALLET_PROVIDER_LABEL[selectedWallet.provider] : ''}
            readOnly
            placeholder="Selecione uma carteira"
            className={control}
          />
        )}
      </FormField>
      <FormField label="Código de indicação" required error={field('referralCode')}>
        {(c) => <Input {...c} {...form.register('referralCode')} className={control} />}
      </FormField>
      <FormField label="E-mail" required error={field('email')}>
        {(c) => (
          <Input
            {...c}
            {...form.register('email')}
            type="email"
            autoComplete="email"
            className={control}
          />
        )}
      </FormField>
      <FormField label="Nome ENS" required error={field('ensName')}>
        {(c) => (
          <div className="flex items-center">
            <Input {...c} {...form.register('ensName')} className={cn(control, 'rounded-r-none')} />
            <span className="grid h-10 place-items-center rounded-r-[3px] border border-l-0 border-border px-3 text-[15px] text-foreground">
              .eth
            </span>
          </div>
        )}
      </FormField>
    </div>
  )

  // "Usar outra carteira?" do Figma: alterna entre a carteira principal e a secundária.
  const otherWalletToggle = (
    <label
      className={cn(
        'flex w-fit items-center gap-2 text-[15px] leading-5',
        otherWallet ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        type="checkbox"
        checked={Boolean(otherWallet) && walletId === otherWallet?.id}
        disabled={!otherWallet}
        onChange={(e) => {
          const next = e.target.checked ? otherWallet : list[0]
          if (next) setWalletId(next.id)
        }}
        className="size-[15px] appearance-none rounded-full border-2 border-primary checked:bg-primary checked:shadow-[inset_0_0_0_2px_var(--color-ink)]"
      />
      Usar outra carteira?
      {!otherWallet && <span className="sr-only">(cadastre uma carteira secundária)</span>}
    </label>
  )

  const noteField = (
    <FormField label="Observação do colecionador (opcional)" error={field('note')}>
      {(c) => (
        <Textarea
          {...c}
          {...form.register('note')}
          rows={4}
          className="mt-[-2px] [field-sizing:fixed] h-[152px] rounded-[3px] border-border bg-transparent md:w-[350px] dark:bg-transparent"
        />
      )}
    </FormField>
  )

  return (
    <Container className="pb-12 md:pt-8">
      <MobileTopBar
        title="Pagamento com carteira"
        fallback="/carrinho"
        className="pt-8 [&_h1]:leading-4"
      />
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
        className="mt-4 grid gap-10 md:mt-8 lg:grid-cols-[1fr_360px] lg:gap-7 xl:grid-cols-[763px_405px] xl:gap-8"
      >
        <section aria-labelledby="perfil-colecionador" className="order-2 space-y-3 lg:order-1">
          <h2 id="perfil-colecionador" className="text-[17px] leading-4 font-bold">
            Perfil do colecionador
          </h2>
          <FormAlert message={formError} />
          {formFields}
          <div className="space-y-6 pt-3">
            {!loadingForm && otherWalletToggle}
            {!loadingForm && noteField}
          </div>
        </section>

        <aside aria-label="Resumo e carteira" className="order-1 space-y-5 md:space-y-3 lg:order-2">
          <section aria-labelledby="seus-nfts" className="hidden md:block">
            <h2 id="seus-nfts" className="text-[17px] leading-4 font-bold">
              Seus NFTs
            </h2>
            <div className="mt-3 flex justify-between border-b border-primary/30 pb-3 text-body-lg leading-4">
              <span className="font-bold">NFTs</span>
              <span className="font-medium">Subtotal</span>
            </div>
            <div className="mt-3">
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
                className="w-full text-center text-body leading-4 hover:text-primary"
              >
                Tem um código promocional? Aplique aqui
              </button>
            )}
          </div>

          <div className="hidden md:block">
            <QuoteSummary quote={quote.data} isLoading={quote.isPending} variant="checkout" />
          </div>

          <section aria-labelledby="carteira-rede" className="space-y-3 md:space-y-5 md:pt-3">
            <h2
              id="carteira-rede"
              className="text-title font-bold md:text-center md:text-[17px] md:leading-4"
            >
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

          <Button
            type="submit"
            size="lg"
            className="hidden h-10 w-full rounded-[3px] text-[15px] leading-4 lg:mt-6! lg:flex"
            disabled={!canReview}
          >
            {isPreparing ? 'Atualizando valores…' : 'Revisar e confirmar compra'}
          </Button>
        </aside>

        <Button
          type="submit"
          size="lg"
          // Confirm Button do frame mobile: 60 px, raio de 40 px e gradiente.
          className="order-3 h-[60px] w-full rounded-[40px] bg-gradient-to-r from-primary to-primary/80 text-[15px] leading-4 lg:hidden"
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
