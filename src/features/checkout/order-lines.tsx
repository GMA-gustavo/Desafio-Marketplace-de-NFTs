import { NftImage } from '@/components/nft/nft-image'
import type { EthAmount } from '@/contracts/common'
import { formatEth } from '@/lib/money'

interface Line {
  nftId: string
  editionId: string
  name: string
  tokenId: string
  art: string
  quantity: number
  lineTotal: EthAmount
}

/** Lista "Seus NFTs" do pagamento e do recibo (sempre a partir da cotação/snapshot). */
export function OrderLines({ lines, compact }: { lines: Line[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'space-y-2' : 'space-y-2 md:space-y-3'}>
      {lines.map((line) => (
        <li
          key={`${line.nftId}-${line.editionId}`}
          className={
            compact
              ? 'flex items-center gap-3'
              : // Linhas de 70 px do Figma (Seus NFTs), com a arte quase colada à esquerda.
                'flex items-center gap-3 bg-surface-card p-1 md:h-[70px] md:gap-1.5 md:py-0.5 md:pr-4'
          }
        >
          <NftImage
            art={line.art}
            alt=""
            sizes="66px"
            className={compact ? 'w-14 rounded-sm' : 'w-14 rounded-sm md:w-[66px] md:rounded-lg'}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-lg font-bold md:leading-4">{line.name}</p>
            <p className="text-caption text-text-secondary md:mt-1.5 md:text-body md:leading-4 md:whitespace-nowrap md:text-text-muted">
              ID do token: {line.tokenId}
            </p>
          </div>
          <p className="text-caption whitespace-nowrap text-text-secondary md:text-body md:leading-4">
            (x {line.quantity})
          </p>
          <p className="min-w-20 pr-2 text-right font-bold whitespace-nowrap text-primary tabular-nums md:pr-0 md:text-[18px] md:leading-4 md:text-text-accent">
            {formatEth(line.lineTotal)}
          </p>
        </li>
      ))}
    </ul>
  )
}
