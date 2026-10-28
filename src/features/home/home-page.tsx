import { Container } from '@/components/layout/container'
import { CatalogSection } from '@/features/catalog/catalog-section'
import { Hero } from './hero'
import { Blog, Promos } from './promos-and-blog'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Container className="mt-8 space-y-16 md:mt-24 md:space-y-24">
        <CatalogSection />
        <Promos />
        <Blog />
      </Container>
    </>
  )
}
