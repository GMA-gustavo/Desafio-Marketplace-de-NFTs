import { Container } from '@/components/layout/container'

/** Usado só enquanto a tela correspondente não foi implementada. */
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <Container className="py-16">
      <h1 className="text-heading font-bold">{title}</h1>
      <p className="mt-2 text-text-secondary">Em construção.</p>
    </Container>
  )
}
