/** "0xA91F3c…E82C" — encurta endereços longos para exibição. */
export function shortAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
