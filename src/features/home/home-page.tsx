import { Container } from '@/components/layout/container'
import { CatalogSection, MobileCatalogBar } from '@/features/catalog/catalog-section'
import { Hero } from './hero'
import { Blog, Promos } from './promos-and-blog'

export default function HomePage() {
  return (
    <>
      {/* Mobile / Início: busca e filtros no topo (40 px), antes do hero. */}
      <Container className="pt-10 md:hidden">
        <MobileCatalogBar />
      </Container>
      <Hero />
      <Container className="mt-4 space-y-16 md:mt-24 md:space-y-24">
        <CatalogSection />
        <Promos />
        <Blog />
      </Container>
    </>
  )
}
