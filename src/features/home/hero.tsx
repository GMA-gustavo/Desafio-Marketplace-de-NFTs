import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { catalogApi } from '@/api/catalog'
import { queryKeys } from '@/api/query-keys'
import { Container } from '@/components/layout/container'
import { NftImage } from '@/components/nft/nft-image'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** 1º slide é estático: a imagem do LCP não depende da API. */
const FIRST_SLIDE = { id: 'emerald-ape-042', name: 'Emerald Ape #042', art: 'emerald-ape' }

export function Hero() {
  const highlights = useQuery({
    queryKey: queryKeys.highlights,
    queryFn: ({ signal }) => catalogApi.highlights(signal),
  })
  const slides = [
    FIRST_SLIDE,
    ...(highlights.data?.hero.filter((n) => n.id !== FIRST_SLIDE.id) ?? []).slice(0, 2),
  ]
  const [index, setIndex] = useState(0)
  const current = slides[Math.min(index, slides.length - 1)]!

  const dots = (
    <div role="group" aria-label="Destaques" className="flex items-center gap-1.5">
      {(slides.length > 1 ? slides : [FIRST_SLIDE, FIRST_SLIDE, FIRST_SLIDE]).map((slide, i) => (
        <button
          key={`${slide.id}-${i}`}
          type="button"
          onClick={() => setIndex(i)}
          disabled={slides.length <= 1}
          aria-label={`Mostrar destaque ${i + 1} de ${Math.max(slides.length, 3)}: ${slide.name}`}
          aria-current={i === index ? 'true' : undefined}
          className={cn(
            'size-2 rounded-full bg-primary/50 transition-all hover:bg-primary',
            i === index && 'w-4 bg-primary',
          )}
        />
      ))}
    </div>
  )

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques da Kurio">
      {/* Desktop / tablet */}
      <Container className="hidden pt-6 md:block">
        <div className="grid grid-cols-[1fr_minmax(280px,450px)] items-center gap-10">
          <div className="pl-0 lg:pl-8">
            <p className="text-body">Bem-vindo à Kurio</p>
            <h1 className="mt-3 text-display-sm font-bold uppercase lg:text-display">
              Seja dono do futuro <br className="hidden lg:block" />
              da arte digital
            </h1>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
              digital rara, apoie artistas e tenha uma parte da cultura da internet.
            </p>
            <a href="#catalogo" className={buttonVariants({ className: 'mt-8 uppercase' })}>
              Explorar
            </a>
            <div className="mt-8 flex justify-end pr-8">{dots}</div>
          </div>
          <Link
            to="/nft/$nftId"
            params={{ nftId: current.id }}
            aria-label={`Ver ${current.name}`}
            className="block overflow-hidden rounded-3xl"
          >
            <NftImage
              key={current.art}
              art={current.art}
              alt={current.name}
              sizes="(min-width: 1024px) 450px, 40vw"
              priority={index === 0}
              className="animate-in duration-500 fade-in"
            />
          </Link>
        </div>
      </Container>

      {/* Mobile (frame Mobile / Início) */}
      <Container className="md:hidden">
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#8a5a33] via-surface-dark to-surface-card p-3">
          <div aria-hidden className="absolute -top-10 left-16 size-48 rounded-full bg-white/5" />
          <div className="relative grid grid-cols-[1fr_auto] gap-3">
            <div>
              <p className="text-caption font-bold">Bem-vindo à Kurio</p>
              <h1 className="mt-1 text-title font-bold uppercase">Seja dono da cultura digital</h1>
              <p className="mt-1 text-caption text-text-secondary">
                Descubra NFTs selecionados de criadores do mundo todo.
              </p>
              <a
                href="#catalogo"
                className="mt-1 inline-flex items-center gap-1 text-caption font-bold text-primary"
              >
                EXPLORAR <ArrowRight className="size-3.5" aria-hidden />
              </a>
            </div>
            <Link
              to="/nft/$nftId"
              params={{ nftId: current.id }}
              aria-label={`Ver ${current.name}`}
              className="w-28"
            >
              <NftImage
                art={current.art}
                alt={current.name}
                sizes="112px"
                priority={index === 0}
                className="rounded-lg"
              />
            </Link>
          </div>
          <div className="relative mt-2 flex justify-center">{dots}</div>
        </div>
      </Container>
    </section>
  )
}
