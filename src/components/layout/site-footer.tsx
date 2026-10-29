import { Link } from '@tanstack/react-router'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/components/brand/social-icons'
import { notifyComingSoon } from '@/lib/coming-soon'
import { Container } from './container'
import { NewsletterForm } from './newsletter-form'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const COLLECTIONS = [
  { slug: 'arte-digital', label: 'Arte digital' },
  { slug: 'fotografia', label: 'Fotografia' },
  { slug: 'musica', label: 'Música' },
  { slug: 'arte-3d', label: 'Arte 3D' },
  { slug: 'utilidade', label: 'Utilidade' },
]

const SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com', Icon: InstagramIcon },
  { label: 'Twitter', href: 'https://twitter.com', Icon: TwitterIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com', Icon: YoutubeIcon },
]

const linkClass = 'text-body leading-[30px] text-foreground transition-colors hover:text-primary'

function SoonLink({ children }: { children: string }) {
  return (
    <button type="button" className={linkClass} onClick={() => notifyComingSoon(children)}>
      {children}
    </button>
  )
}

export function SiteFooter() {
  return (
    // Footer do Figma: medalhões + newsletter (250 px), faixa da marca (88 px) e links (236 px).
    <footer className="mt-24 pb-24 md:pb-6">
      <Container>
        <div className="bg-surface-card">
          <div className="grid gap-8 p-6 sm:grid-cols-2 lg:flex lg:h-[250px] lg:gap-0 lg:p-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="lg:flex-1 lg:border-r lg:border-primary lg:px-4">
                <span
                  aria-hidden
                  className="grid size-[74px] place-items-center rounded-full bg-primary text-heading-sm leading-none font-bold text-ink"
                >
                  {f.letter}
                </span>
                <h2 className="mt-3 text-[17px] leading-4 font-bold">{f.title}</h2>
                <p className="mt-3 max-w-[204px] text-body leading-[22px] text-text-secondary">
                  {f.text}
                </p>
              </div>
            ))}
            <div className="lg:w-[357px] lg:shrink-0 lg:px-4">
              <h2 className="text-[18px] leading-4 font-bold">Antecipe-se ao próximo lançamento</h2>
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="grid gap-3 bg-surface-dark px-6 py-5 text-body leading-[22px] sm:grid-cols-2 lg:h-[88px] lg:grid-cols-[1fr_1fr_1fr_228px] lg:items-center lg:gap-[92px] lg:p-8">
          <span className="font-bold tracking-[0.1em]">KURIO</span>
          {/* No Figma o texto tem 219 px e passa um pouco da coluna: quebra em duas linhas. */}
          <span className="lg:w-[219px]">Feito para colecionadores, criadores e cultura</span>
          <a href="mailto:contato@email.com" className="hover:text-primary">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="hover:text-primary">
            +55 11 4002 8922
          </a>
        </div>

        <div className="bg-surface-card">
          <div className="grid gap-8 p-6 sm:grid-cols-2 lg:flex lg:h-[236px] lg:gap-[124px] lg:p-8">
            <nav aria-labelledby="footer-perfil" className="lg:flex-1">
              <h2 id="footer-perfil" className="text-[18px] leading-4 font-bold">
                Meu perfil
              </h2>
              <ul className="mt-2">
                <li>
                  <Link to="/perfil" className={linkClass}>
                    Meu perfil
                  </Link>
                </li>
                <li>
                  <SoonLink>Minha coleção</SoonLink>
                </li>
                <li>
                  <SoonLink>Atividade</SoonLink>
                </li>
                <li>
                  <SoonLink>Estúdio do criador</SoonLink>
                </li>
                <li>
                  <Link to="/favoritos" className={linkClass}>
                    Lista de interesse
                  </Link>
                </li>
              </ul>
            </nav>
            <nav aria-labelledby="footer-ajuda" className="lg:flex-1">
              <h2 id="footer-ajuda" className="text-[18px] leading-4 font-bold">
                Central de ajuda
              </h2>
              <ul className="mt-2">
                {[
                  'Central de ajuda',
                  'Como comprar NFTs',
                  'Carteira e segurança',
                  'Política do mercado',
                  'Denunciar item',
                ].map((label) => (
                  <li key={label}>
                    <SoonLink>{label}</SoonLink>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-labelledby="footer-colecoes" className="lg:flex-1">
              <h2 id="footer-colecoes" className="text-[18px] leading-4 font-bold">
                Coleções
              </h2>
              <ul className="mt-2">
                {COLLECTIONS.map((c) => (
                  <li key={c.slug}>
                    <Link
                      to="/"
                      hash="catalogo"
                      search={{ categories: [c.slug] }}
                      className={linkClass}
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="lg:w-[228px] lg:shrink-0">
              <h2 className="text-[18px] leading-4 font-bold">Redes sociais</h2>
              <ul className="mt-5 flex gap-2.5">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} (abre em nova aba)`}
                      className="grid size-[30px] place-items-center rounded-sm border border-primary text-primary transition-colors hover:bg-primary hover:text-ink"
                    >
                      <Icon className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
              <h2 className="mt-8 text-[18px] leading-4 font-bold">Carteiras compatíveis</h2>
              <p className="mt-3 flex h-[26px] items-center rounded-md border border-border-soft bg-surface-dark px-2 text-[9px] leading-none font-bold tracking-[0.1px] text-text-accent">
                <span className="flex w-[215px] justify-between">
                  <span>METAMASK</span>
                  <span aria-hidden>•</span>
                  <span>WALLETCONNECT</span>
                  <span aria-hidden>•</span>
                  <span>COINBASE</span>
                </span>
              </p>
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-center text-body leading-[30px]">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </Container>
    </footer>
  )
}
