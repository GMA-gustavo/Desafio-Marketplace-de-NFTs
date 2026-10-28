import { cn } from '@/lib/utils'

const WIDTHS = [160, 320, 640, 960] as const

interface NftImageProps extends Omit<React.ComponentProps<'img'>, 'src' | 'srcSet'> {
  /** Slug da arte exportada do Figma (ex.: "emerald-ape"). */
  art: string
  alt: string
  /** Valor de `sizes` para o navegador escolher a variante. */
  sizes: string
  priority?: boolean
}

/** Imagem quadrada responsiva (AVIF com fallback WebP), com dimensões fixas para evitar CLS. */
export function NftImage({ art, alt, sizes, priority, className, ...props }: NftImageProps) {
  const srcSet = (ext: string) =>
    WIDTHS.map((w) => `/images/nfts/${art}-${w}.${ext} ${w}w`).join(', ')

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <img
        src={`/images/nfts/${art}-640.webp`}
        srcSet={srcSet('webp')}
        sizes={sizes}
        alt={alt}
        width={640}
        height={640}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'async'}
        className={cn('aspect-square h-auto w-full object-cover', className)}
        {...props}
      />
    </picture>
  )
}
