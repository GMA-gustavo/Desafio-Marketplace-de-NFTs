import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { NftImage } from '@/components/nft/nft-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Vitrine provisória do design system — substituída pela Home real na Fase 5.
function HomePage() {
  return (
    <Container className="space-y-10 py-10">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <p className="text-body">Bem-vindo à Kurio</p>
          <h1 className="mt-2 text-display-sm font-bold uppercase md:text-display">
            Seja dono do futuro da arte digital
          </h1>
          <p className="mt-2 max-w-md text-body text-text-secondary">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
          </p>
          <div className="mt-6 flex gap-3">
            <Button>EXPLORAR</Button>
            <Button variant="outline">Favoritar</Button>
          </div>
        </div>
        <NftImage
          art="emerald-ape"
          alt="Emerald Ape #042"
          sizes="(min-width: 768px) 450px, 100vw"
          priority
          className="ml-auto max-w-[450px] rounded-3xl"
        />
      </section>
      <section id="catalogo" className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {['emerald-ape', 'nomad-gorilla', 'baron-ape', 'golden-ape'].map((art) => (
          <div key={art} className="bg-surface-card p-1">
            <NftImage art={art} alt={art} sizes="240px" className="rounded-lg" />
            <p className="mt-2 text-body">{art}</p>
            <p className="text-body-lg font-bold text-primary">1.19 ETH</p>
          </div>
        ))}
      </section>
      <section className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </section>
      <Input placeholder="Digite o código promocional..." className="max-w-xs" />
    </Container>
  )
}
