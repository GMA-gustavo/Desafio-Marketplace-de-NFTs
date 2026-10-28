/**
 * Com os mocks ligados, nenhuma requisição pode sair antes de o MSW assumir a rede — senão ela
 * iria para um servidor que não existe. O app renderiza sem esperar (layout e skeletons aparecem
 * logo); quem fala com a rede (HTTP, Socket.IO, painel de cenários) aguarda esta promessa.
 */
let resolveReady: () => void = () => undefined

export const networkReady = new Promise<void>((resolve) => {
  resolveReady = resolve
})

export function markNetworkReady() {
  resolveReady()
}
