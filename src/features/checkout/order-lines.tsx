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
    <ul className="space-y-2">
      {lines.map((line) => (
        <li
          key={`${line.nftId}-${line.editionId}`}
          className={
            compact ? 'flex items-center gap-3' : 'flex items-center gap-3 bg-surface-card p-1'
          }
        >
          <NftImage art={line.art} alt="" sizes="56px" className="w-14 rounded-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-lg font-bold">{line.name}</p>
            <p className="text-caption text-text-secondary">ID do token: {line.tokenId}</p>
          </div>
          <p className="text-caption whitespace-nowrap text-text-secondary">(x {line.quantity})</p>
          <p className="min-w-20 pr-2 text-right font-bold whitespace-nowrap text-primary tabular-nums">
            {formatEth(line.lineTotal)}
          </p>
        </li>
      ))}
    </ul>
  )
}
