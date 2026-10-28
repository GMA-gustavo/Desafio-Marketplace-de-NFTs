import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { MockControl } from '@/mocks/control'
import type { ScenarioName } from '@/mocks/scenarios'

/**
 * Painel de cenários (disponível também no build de demonstração).
 * Toda ação passa pela camada de mocks — REST e Socket.IO —, nunca altera a UI diretamente.
 */
export default function MockPanel() {
  const mocks = window.__kurioMocks as MockControl
  const queryClient = useQueryClient()
  const [scenario, setScenario] = useState(() => mocks.getConfig().scenario)

  const firstCartItem = () => {
    const item = mocks.cartItems()[0]
    if (!item) toast.error('Adicione um NFT ao carrinho primeiro.')
    return item
  }

  const actions: { label: string; run: () => void | Promise<void> }[] = [
    {
      label: 'Alterar preço do 1º item do carrinho (+10%)',
      run: () => {
        const item = firstCartItem()
        if (item) mocks.changePrice(item.nftId, '1.1', item.editionId)
      },
    },
    {
      label: 'Esgotar edição do 1º item do carrinho',
      run: () => {
        const item = firstCartItem()
        if (item) mocks.sellOut(item.nftId, item.editionId)
      },
    },
    { label: 'Expirar sessão agora', run: () => mocks.expireSessions() },
    { label: 'Derrubar conexão em tempo real', run: () => mocks.realtime.disconnectAll() },
    { label: 'Reenviar último evento (duplicado)', run: () => void mocks.realtime.replayLast() },
    {
      label: 'Liquidar pedidos pendentes agora',
      run: () => mocks.pendingOrders().forEach((o) => mocks.settleOrder(o.id)),
    },
  ]

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Abrir painel de cenários de simulação"
            className="fixed bottom-20 left-3 z-40 grid size-10 place-items-center rounded-full border border-border-soft bg-surface-raised text-primary shadow-lg hover:bg-surface-dark md:bottom-4"
          />
        }
      >
        <FlaskConical className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cenários de simulação</SheetTitle>
          <SheetDescription>
            Controla o backend simulado (MSW + Socket.IO). As mudanças valem para as próximas
            requisições.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <fieldset>
            <legend className="text-body-lg font-bold">Cenário</legend>
            <div className="mt-3 space-y-2">
              {(
                Object.entries(mocks.scenarios) as [
                  ScenarioName,
                  { label: string; description: string },
                ][]
              ).map(([name, preset]) => (
                <label
                  key={name}
                  htmlFor={`scenario-${name}`}
                  aria-label={`${preset.label}: ${preset.description}`}
                  className="flex cursor-pointer gap-3 rounded-sm border border-border p-2 has-checked:border-primary has-checked:bg-primary/10"
                >
                  <input
                    id={`scenario-${name}`}
                    type="radio"
                    name="scenario"
                    value={name}
                    checked={scenario === name}
                    onChange={() => {
                      mocks.setScenario(name)
                      setScenario(name)
                      void queryClient.invalidateQueries()
                      toast.success(`Cenário "${preset.label}" ativado.`)
                    }}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <span className="block font-bold">{preset.label}</span>
                    <span className="block text-caption text-text-secondary">
                      {preset.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <section aria-labelledby="mock-actions">
            <h3 id="mock-actions" className="text-body-lg font-bold">
              Eventos e falhas
            </h3>
            <div className="mt-3 grid gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start"
                  onClick={() => void action.run()}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </section>

          <section aria-labelledby="mock-users">
            <h3 id="mock-users" className="text-body-lg font-bold">
              Contas de demonstração
            </h3>
            <ul className="mt-2 space-y-1 text-caption">
              {mocks.demoUsers.map((u) => (
                <li key={u.email}>
                  <span className="font-bold">{u.name}</span> — {u.email} / {u.password}
                </li>
              ))}
            </ul>
          </section>

          <Button
            className="w-full"
            onClick={() => {
              void mocks.reset()
            }}
          >
            Restaurar dados iniciais (reset)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
