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

const linkClass = 'text-body text-foreground/90 transition-colors hover:text-primary'

function SoonLink({ children }: { children: string }) {
  return (
    <button type="button" className={linkClass} onClick={() => notifyComingSoon(children)}>
      {children}
    </button>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24 pb-24 md:pb-0">
      <Container>
        <div className="bg-surface-card">
          <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-10">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="lg:border-r lg:border-primary lg:pr-6 lg:not-first:pl-4"
              >
                <span
                  aria-hidden
                  className="grid size-15 place-items-center rounded-full bg-primary text-title font-bold text-ink"
                >
                  {f.letter}
                </span>
                <h2 className="mt-3 text-body-lg font-bold">{f.title}</h2>
                <p className="mt-2 text-body leading-[18px] text-text-secondary">{f.text}</p>
              </div>
            ))}
            <div className="lg:pl-4">
              <h2 className="text-body-lg leading-tight font-bold">
                Antecipe-se ao próximo lançamento
              </h2>
              <NewsletterForm />
            </div>
          </div>

          <div className="grid gap-3 bg-surface-dark px-6 py-5 text-body sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
            <span className="font-bold tracking-[0.12em]">KURIO</span>
            <span>Feito para colecionadores, criadores e cultura</span>
            <a href="mailto:contato@email.com" className="hover:text-primary">
              contato@email.com
            </a>
            <a href="tel:+551140028922" className="hover:text-primary">
              +55 11 4002 8922
            </a>
          </div>

          <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
            <nav aria-labelledby="footer-perfil">
              <h2 id="footer-perfil" className="text-body-lg font-bold">
                Meu perfil
              </h2>
              <ul className="mt-3 space-y-2">
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
            <nav aria-labelledby="footer-ajuda">
              <h2 id="footer-ajuda" className="text-body-lg font-bold">
                Central de ajuda
              </h2>
              <ul className="mt-3 space-y-2">
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
            <nav aria-labelledby="footer-colecoes">
              <h2 id="footer-colecoes" className="text-body-lg font-bold">
                Coleções
              </h2>
              <ul className="mt-3 space-y-2">
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
            <div>
              <h2 className="text-body-lg font-bold">Redes sociais</h2>
              <ul className="mt-3 flex gap-2">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} (abre em nova aba)`}
                      className="grid size-7 place-items-center rounded-sm border border-primary text-primary transition-colors hover:bg-primary hover:text-ink"
                    >
                      <Icon className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
              <h2 className="mt-6 text-body-lg font-bold">Carteiras compatíveis</h2>
              <p className="mt-3 inline-block rounded-sm border border-border-soft bg-surface-raised px-2 py-1 text-tiny font-bold tracking-wide text-primary">
                METAMASK · WALLETCONNECT · COINBASE
              </p>
            </div>
          </div>
        </div>
        <p className="py-4 text-center text-body">© 2026 Kurio. Propriedade digital para todos.</p>
      </Container>
    </footer>
  )
}
