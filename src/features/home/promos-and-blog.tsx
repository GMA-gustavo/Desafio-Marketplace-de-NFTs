import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/nft/nft-image'
import { buttonVariants } from '@/components/ui/button'
import { notifyComingSoon } from '@/lib/coming-soon'

const PROMOS = [
  {
    art: 'emerald-ape',
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    search: { tab: 'new' as const },
  },
  {
    art: 'baron-ape',
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    search: { categories: ['arte-digital'] },
  },
]

const POSTS = [
  {
    art: 'baron-ape',
    date: '12 de setembro',
    minutes: 6,
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    art: 'emerald-ape',
    date: '13 de setembro',
    minutes: 2,
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    art: 'nomad-gorilla',
    date: '15 de setembro',
    minutes: 3,
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    art: 'golden-ape',
    date: '15 de setembro',
    minutes: 2,
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
  },
]

export function Promos() {
  return (
    <section aria-label="Coleções em destaque" className="grid gap-6 md:grid-cols-2">
      {PROMOS.map((promo) => (
        <article
          key={promo.title}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-sm bg-surface-card"
        >
          <NftImage
            art={promo.art}
            alt=""
            sizes="(min-width: 768px) 235px, 50vw"
            className="h-full rounded-r-2xl"
          />
          <div className="flex flex-col items-end justify-center gap-3 p-4 text-right">
            <h2 className="text-body-lg font-bold">{promo.title}</h2>
            <p className="text-caption text-text-secondary">{promo.text}</p>
            <Link
              to="/"
              hash="catalogo"
              search={promo.search}
              className={buttonVariants({ size: 'sm', className: 'h-8' })}
            >
              Explorar <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

export function Blog() {
  return (
    <section aria-labelledby="blog-title">
      <div className="text-center">
        <h2 id="blog-title" className="text-heading font-bold">
          Diário da Cunhagem
        </h2>
        <p className="mt-2 text-body text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="h-full overflow-hidden rounded-sm bg-surface-card">
              <NftImage
                art={post.art}
                alt=""
                sizes="(min-width: 1024px) 220px, 50vw"
                className="aspect-[219/160]"
              />
              <div className="space-y-2 p-3">
                <p className="text-caption text-text-secondary">
                  {post.date} | Leitura de {post.minutes} min
                </p>
                <h3 className="text-body-lg font-bold">{post.title}</h3>
                <p className="text-caption text-text-secondary">{post.text}</p>
                <button
                  type="button"
                  onClick={() => notifyComingSoon('O Diário da Cunhagem')}
                  className="text-caption font-bold text-primary hover:underline"
                  aria-label={`Ler mais: ${post.title}`}
                >
                  Ler mais →
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
