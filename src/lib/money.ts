import Big from 'big.js'
import type { EthAmount } from '@/contracts/common'

// 18 casas = precisão de wei; arredondamento bancário desligado (half-up).
Big.DP = 18
Big.RM = Big.roundHalfUp

export const eth = {
  add: (...values: EthAmount[]): EthAmount =>
    values.reduce((acc, v) => acc.plus(v), new Big(0)).toString(),
  sub: (a: EthAmount, b: EthAmount): EthAmount => new Big(a).minus(b).toString(),
  mul: (a: EthAmount, factor: number | string): EthAmount => new Big(a).times(factor).toString(),
  /** Percentual inteiro (ex.: 10 = 10%), arredondado a 6 casas. */
  percent: (a: EthAmount, pct: number): EthAmount =>
    new Big(a).times(pct).div(100).round(6).toString(),
  round: (a: EthAmount, dp = 6): EthAmount => new Big(a).round(dp).toString(),
  cmp: (a: EthAmount, b: EthAmount): number => new Big(a).cmp(b),
  eq: (a: EthAmount, b: EthAmount): boolean => new Big(a).eq(b),
  max: (a: EthAmount, b: EthAmount): EthAmount => (new Big(a).gte(b) ? a : b),
  isZero: (a: EthAmount): boolean => new Big(a).eq(0),
}

/**
 * Formata no padrão do Figma ("1.19 ETH", "26.846 ETH", "0.016 ETH"):
 * no mínimo 2 casas, sem zeros à direita além disso, no máximo 6.
 */
export function formatEth(value: EthAmount, { unit = true }: { unit?: boolean } = {}) {
  const fixed = new Big(value).round(6).toFixed(6)
  const [int, dec = ''] = fixed.split('.')
  const trimmed = dec.replace(/0+$/, '').padEnd(2, '0')
  return `${int}.${trimmed}${unit ? ' ETH' : ''}`
}
