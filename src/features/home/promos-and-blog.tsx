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
    // Dois cards de 586 × 250 com 28 px entre eles, como no Figma.
    <section aria-label="Coleções em destaque" className="grid gap-6 md:grid-cols-2 lg:gap-7">
      {PROMOS.map((promo) => (
        <article
          key={promo.title}
          className="flex min-h-[250px] overflow-hidden rounded-lg bg-surface-card lg:h-[250px]"
        >
          <div className="w-1/2 shrink-0 lg:-ml-[5px] lg:w-[292px]">
            <NftImage
              art={promo.art}
              alt=""
              sizes="(min-width: 1024px) 292px, (min-width: 768px) 25vw, 50vw"
              className="aspect-auto h-full rounded-[18px]"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-end p-4 text-right lg:pt-[37px] lg:pr-[30px] lg:pb-[46px] lg:pl-2">
            <h2 className="max-w-[260px] text-[18px] leading-6 font-bold">{promo.title}</h2>
            <p className="mt-[9px] max-w-[263px] text-body text-text-secondary">{promo.text}</p>
            <Link
              to="/"
              hash="catalogo"
              search={promo.search}
              className={buttonVariants({
                className:
                  'mt-[25px] h-10 w-[140px] justify-between rounded-md px-[27px] leading-5 font-medium lg:mt-auto',
              })}
            >
              Explorar <ArrowRight className="size-[18px]" aria-hidden />
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
        <h2 id="blog-title" className="text-heading leading-[37px] font-bold">
          Diário da Cunhagem
        </h2>
        <p className="mt-3 text-body leading-[18px] text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>
      {/* Quatro cards de 268 px com 24 px entre eles, alinhados à esquerda como no Figma. */}
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(4,268px)] lg:gap-6">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="h-full overflow-hidden rounded-lg bg-surface-card">
              <NftImage
                art={post.art}
                alt=""
                sizes="(min-width: 1024px) 268px, 50vw"
                className="aspect-[268/195]"
              />
              <div className="space-y-2 px-4 pt-3 pb-4">
                <p className="text-caption leading-4 font-medium text-text-secondary">
                  {post.date} | Leitura de {post.minutes} min
                </p>
                <h3 className="text-body-lg leading-[21px] font-bold">{post.title}</h3>
                <p className="text-caption leading-4 font-medium text-text-secondary">
                  {post.text}
                </p>
                <button
                  type="button"
                  onClick={() => notifyComingSoon('O Diário da Cunhagem')}
                  className="flex items-center gap-1 text-caption leading-[14px] text-text-accent hover:underline"
                  aria-label={`Ler mais: ${post.title}`}
                >
                  <span className="font-bold">Ler mais</span>
                  <span aria-hidden>→</span>
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
