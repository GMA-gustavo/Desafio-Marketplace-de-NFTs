# Arquitetura

Este documento descreve como a aplicação está organizada: contratos REST e de eventos, política de sessão, estado do
carrinho, cache, reconciliação entre REST e Socket.IO, o backend simulado, as decisões de UX, os desvios do Figma e as
limitações. Setup e comandos estão no [README](README.md).

## 1. Camadas

```
rotas (TanStack Router)        src/routes        URL, search params validados, guarda de rotas privadas
  └─ features (React)          src/features      telas e hooks por domínio
       └─ TanStack Query       hooks use*        cache, mutations, invalidação, otimismo
            └─ api/*           src/api           uma função por endpoint, resposta validada com zod
                 └─ Axios      src/lib/http.ts   token, carrinho do visitante, timeout, erro normalizado
                      └─ rede  ── MSW (src/mocks) intercepta REST e WebSocket
realtime                       src/realtime      socket.io-client → ponte → cache do Query
contratos                      src/contracts     schemas zod compartilhados por todas as camadas
```

- **Um contrato só.** Cada recurso tem um schema zod em `src/contracts`. Ele valida o corpo da requisição no mock, a
  resposta no cliente (`api/*` faz `schema.parse`) e os formulários (`zodResolver`). Se o mock e a tela discordarem, o
  erro aparece na fronteira e não no meio da interface.
- **Sem atalhos de negócio na UI.** Componentes, hooks e o cliente Axios não têm respostas fictícias nem caminhos
  alternativos. Todo dado passa por HTTP (MSW) ou por `socket.io-client`, inclusive nos testes e no painel de cenários.
- **Valores em ETH** trafegam como string decimal (`"1.19"`) e são calculados com big.js ([src/lib/money.ts](src/lib/money.ts)).
  Quantidades são inteiras. Subtotal, desconto, taxa e total nunca são calculados na tela: vêm da cotação da API.

### Inicialização

[src/main.tsx](src/main.tsx) renderiza a aplicação imediatamente e, em paralelo, carrega e inicia o MSW. A promessa
`networkReady` ([src/lib/network-ready.ts](src/lib/network-ready.ts)) resolve quando o worker assume a rede. Só quem fala
com a rede espera por ela:

- o interceptor de requisição do Axios;
- o cliente Socket.IO, que só importa `socket.io-client` depois dela;
- o painel de cenários.

Layout e skeletons aparecem antes do mock subir, e nenhuma requisição escapa para um servidor inexistente. Com
`VITE_ENABLE_MOCKS=false`, a promessa resolve na hora.

## 2. Contratos REST

Base: `VITE_API_URL` (padrão `/api`). JSON nos dois sentidos.

Cabeçalhos:

- `Authorization: Bearer <token>`, quando há sessão.
- `X-Cart-Id: <id>`, que identifica o carrinho do visitante.
- `Idempotency-Key: <uuid>`, obrigatório em `POST /orders`.

| Recurso   | Método e caminho              | Auth | Entrada → saída                                                                                                   |
| --------- | ----------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------- |
| Sessão    | `POST /auth/register`         | —    | `registerInput` → `{ user, session }` · 409 `email_taken` / `username_taken`                                      |
|           | `POST /auth/login`            | —    | `loginInput` → `{ user, session }` · 401 `invalid_credentials`                                                    |
|           | `GET /auth/session`           | sim  | → `{ user, session }` · 401 `unauthorized` / `session_expired`                                                    |
|           | `POST /auth/logout`           | sim  | → 204; revoga o token                                                                                             |
| NFTs      | `GET /nfts`                   | —    | `q, categories, networks, minPrice, maxPrice, collection, exclude, tab, sort, page, pageSize` → página + `facets` |
|           | `GET /nfts/highlights`        | —    | → `{ hero[], spotlight }`                                                                                         |
|           | `GET /nfts/:id`               | —    | → `nftDetail` com edições, estoque e `version` · 404 `not_found`                                                  |
| Favoritos | `GET /favorites`              | sim  | → `{ ids[], items[] }`                                                                                            |
|           | `PUT /favorites/:nftId`       | sim  | → 204 (idempotente)                                                                                               |
|           | `DELETE /favorites/:nftId`    | sim  | → 204 (idempotente)                                                                                               |
| Carrinho  | `GET /cart`                   | opc. | → `cart` (usuário ou visitante)                                                                                   |
|           | `POST /cart/items`            | opc. | `{ nftId, editionId, quantity }` → `cart` · 409 `edition_unavailable` / `insufficient_stock`                      |
|           | `PATCH /cart/items/:itemId`   | opc. | `{ quantity }` → `cart`; diminuir sempre é aceito, aumentar respeita `maxPerOrder`                                |
|           | `DELETE /cart/items/:itemId`  | opc. | → `cart`                                                                                                          |
|           | `PUT /cart/coupon`            | opc. | `{ code }` → `cart` · 422 `coupon_invalid` / `coupon_expired` com `fieldErrors.code`                              |
|           | `DELETE /cart/coupon`         | opc. | → `cart`                                                                                                          |
|           | `POST /cart/acknowledge`      | opc. | → `cart`; registra que o usuário viu os preços novos                                                              |
|           | `POST /cart/merge`            | sim  | `{ guestCartId }` → `cart`; traz os itens do visitante para a conta                                               |
| Cotação   | `GET /quote?network=`         | opc. | → `quote`: linhas com status, cupom, subtotal, desconto, taxa, total, `valid`, `expiresAt` (10 min)               |
| Pedidos   | `POST /orders`                | sim  | `{ quoteId, walletId, network, buyer }` + `Idempotency-Key` → `order` (201 novo, 200 repetido)                    |
|           | `GET /orders?status=`         | sim  | → `{ items: order[] }` do próprio usuário                                                                         |
|           | `GET /orders/:id`             | sim  | → `order` · 404 `not_found` · 403 `forbidden` (pedido de outro usuário)                                           |
| Perfil    | `GET /profile`                | sim  | → `profile`                                                                                                       |
|           | `PATCH /profile`              | sim  | `updateProfileInput` → `profile` · 409 em e-mail ou usuário em uso                                                |
|           | `PUT /profile/avatar`         | sim  | `{ dataUrl }` (PNG/JPG/WebP, até 512 KB) → `profile`                                                              |
|           | `DELETE /profile/avatar`      | sim  | → `profile`                                                                                                       |
|           | `POST /profile/password`      | sim  | `{ currentPassword, newPassword, confirmPassword }` → 204; encerra as outras sessões do usuário                   |
| Carteiras | `GET /wallets`                | sim  | → `{ primary, secondary }` (cada uma pode ser `null`)                                                             |
|           | `PUT /wallets/:slot`          | sim  | `upsertWalletInput` (`slot` = `primary` ou `secondary`) → `wallet`                                                |
|           | `GET /wallets/connections`    | sim  | → estado de conexão de cada carteira                                                                              |
|           | `POST /wallets/:id/connect`   | sim  | → `connected` · 409 `wallet_rejected` (cenário de recusa)                                                         |
|           | `DELETE /wallets/:id/connect` | sim  | → `disconnected`                                                                                                  |
| Saúde     | `GET /health`                 | —    | → `{ status: 'ok' }`                                                                                              |

Os tipos exatos estão em [src/contracts](src/contracts). Cada `api/*.ts` mostra a chamada correspondente.

### Modelo de erro

Toda resposta de erro tem o mesmo corpo:

```json
{
  "error": {
    "code": "insufficient_stock",
    "message": "…",
    "fieldErrors": { "campo": "mensagem" },
    "details": {}
  }
}
```

| Situação            | Status | Códigos                                                                                                                                                                                                |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Validação           | 422    | `validation_error`, `coupon_invalid`, `coupon_expired`                                                                                                                                                 |
| Sessão inválida     | 401    | `unauthorized`, `session_expired`, `invalid_credentials`                                                                                                                                               |
| Falta de permissão  | 403    | `forbidden`                                                                                                                                                                                            |
| Recurso inexistente | 404    | `not_found`                                                                                                                                                                                            |
| Conflito            | 409    | `email_taken`, `username_taken`, `insufficient_stock`, `edition_unavailable`, `quote_changed`, `quote_expired`, `idempotency_conflict`, `wallet_rejected`, `wallet_required`, `cart_empty`, `conflict` |
| Falha transitória   | 503    | `transient` (as regras de falha dos cenários também geram 500 e erro de rede)                                                                                                                          |

No cliente, `toApiError` ([src/lib/api-error.ts](src/lib/api-error.ts)) transforma qualquer falha do Axios num `ApiError`
com `kind` (`api`, `network`, `timeout` ou `canceled`), `status`, `code`, `fieldErrors` e `details`. A tela nunca lê o
formato do Axios. `isTransient` (rede, timeout ou 5xx) decide se vale tentar de novo, e `fieldErrors` vai direto para os
campos do formulário.

Os conflitos de checkout (`quote_changed`, `quote_expired` e `insufficient_stock`) trazem em `details.quote` a cotação nova,
para que a tela mostre o que mudou sem outra requisição.

## 3. Eventos Socket.IO

Conexão: `io(VITE_SOCKET_URL, { transports: ['websocket'], auth: { token } })`. O servidor simulado lê o token no pacote
CONNECT e associa a conexão ao usuário; um visitante conecta sem token.

Todo evento usa o mesmo envelope ([src/contracts/realtime.ts](src/contracts/realtime.ts)):

```ts
{
  eventId: string                 // identidade da entrega, usada na deduplicação
  type: 'nft.updated' | 'order.updated'
  resource: { type: 'nft' | 'order', id: string }
  version: number                 // versão do recurso; define a ordem dos estados
  occurredAt: string
  data: …
}
```

| Evento          | Quem recebe                         | `data`                                             | Efeito no cliente                                                                                                                     |
| --------------- | ----------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `nft.updated`   | Todas as conexões                   | preço, preço riscado, disponibilidade e as edições | Atualiza catálogo, destaques, detalhe e favoritos no cache. Se o NFT está no carrinho, recarrega carrinho e cotação e avisa o usuário |
| `order.updated` | Só as conexões autenticadas do dono | o pedido completo                                  | Atualiza o pedido no cache, invalida a lista de pedidos e, em estado terminal, o carrinho; limpa o pedido pendente guardado           |

Toda mudança no DB simulado que afeta preço ou estoque passa por `updateNft`
([src/mocks/services/nft-updates.ts](src/mocks/services/nft-updates.ts)). Essa função incrementa a `version` do NFT, grava
o estado e publica `nft.updated`, então REST e socket nunca divergem. O mesmo vale para os pedidos: criação e liquidação
publicam `order.updated`.

### Garantias do cliente

[src/realtime/realtime-client.ts](src/realtime/realtime-client.ts):

- **Duplicatas:** um evento com `eventId` já visto é ignorado (janela dos últimos 500).
- **Eventos antigos:** um evento com `version` menor ou igual à última conhecida do recurso é descartado. A ponte ainda
  confere a `version` de cada entrada do cache antes de aplicar, então um dado mais novo vindo do REST também não regride.
- **Validação:** o payload passa pelo schema zod, e um evento malformado é ignorado.
- **Outro usuário:** um `order.updated` cujo `userId` não é o da sessão atual é descartado, além de o servidor já filtrar.
- **Ciclo de vida:** existe uma conexão por identidade. Login, logout e troca de usuário destroem o socket, os listeners,
  o histórico de `eventId` e as versões, e abrem uma conexão nova. Os listeners da ponte são removidos no unmount.
- **Reconexão:** depois da primeira conexão, cada novo `connect` dispara `invalidateQueries({ type: 'active' })`, ou seja,
  tudo o que está na tela é reconciliado via REST.

## 4. Política de sessão

- **Token** opaco, guardado em `localStorage` (`kurio.session`) junto com o `userId`. Validade de 24 h no cenário padrão
  e de 1 minuto em `short-session`.
- **Recuperação após refresh:** a sessão é uma query (`['session']`, `staleTime: Infinity`) que chama `GET /auth/session`.
  401 vira visitante e limpa o token. Erro de rede não desloga ninguém: a query falha e pode ser tentada de novo.
- **Rotas privadas** (`/pagamento`, `/pedidos/$orderId`, `/perfil`, `/perfil/carteiras`, `/favoritos`): o `beforeLoad`
  usa `ensureQueryData(session)` e redireciona para `/entrar?redirect=<href atual>`. Depois do login, `safeRedirect` aceita
  só caminhos internos, o que evita open redirect.
- **Expiração durante o uso:** qualquer resposta 401 `session_expired` aciona o `SessionWatcher`, que:
  - limpa os dados privados;
  - mostra um aviso;
  - leva ao login com `redirect` para a tela atual.

  O rascunho do checkout, a tentativa de compra em andamento e o pedido pendente ficam guardados, marcados com o `userId`,
  e só são retomados pelo mesmo usuário.

- **Logout e troca de usuário** (`clearPrivateState`):
  - removem `['user', …]` e `['cart', …]` do cache;
  - zeram a sessão;
  - desconectam o socket;
  - apagam rascunho, tentativa e pedido pendente.

  Ao entrar com outro usuário, qualquer contexto de checkout de um `userId` diferente é descartado.

- **Troca de senha** encerra as outras sessões do mesmo usuário no servidor simulado.

## 5. Estado do carrinho

- **O carrinho é estado do servidor.** O cliente não guarda itens: o TanStack Query guarda a resposta de `GET /cart` em
  `['cart', userId | 'guest']`.
- **Visitante:** na primeira chamada, o servidor cria um carrinho anônimo e o cliente guarda o id (`kurio.guestCartId`),
  enviado depois em `X-Cart-Id`. Por isso o carrinho sobrevive a refresh mesmo sem login.
- **Ao autenticar:** `completeAuthentication` grava o token, chama `POST /cart/merge` com o id do visitante e só então
  publica o usuário no cache. A ordem importa: se a busca do carrinho da conta, disparada pela troca de sessão, terminasse
  depois, sobrescreveria o carrinho mesclado. No merge, as quantidades somam e respeitam `maxPerOrder`, e o cupom do
  visitante só entra se a conta não tiver um.
- **Disponibilidade:** cada edição tem `available` e `maxPerOrder`. A API recusa aumentar além do limite, e a tela limita
  o seletor de quantidade com os mesmos números.
- **Preço visto:** cada linha guarda o `priceSeen`. Se o preço muda, a linha volta com `previousUnitPrice` e a tela mostra
  "de X para Y" até o usuário confirmar (`POST /cart/acknowledge`).
- **Cotação:** `GET /quote` é a referência para o resumo e para o pedido. Ela traz o status de cada linha (`ok`,
  `price_changed`, `insufficient` ou `sold_out`), o cupom aplicado e `valid`. Com `valid: false`, finalizar fica
  bloqueado.
- **Depois da compra:** só os itens e quantidades comprados saem do carrinho, e isso só acontece na confirmação. Uma
  recusa mantém o carrinho e devolve o estoque reservado.

## 6. Cache, retries e sincronização

**Query keys** ([src/api/query-keys.ts](src/api/query-keys.ts)): os dados privados ficam sob `['user', userId, …]` e o
carrinho sob `['cart', owner, …]`. Um usuário nunca lê o cache de outro, e o logout limpa tudo com duas chamadas. A chave
do catálogo é o objeto exato de parâmetros enviado à API, com listas ordenadas, então cada combinação de filtros tem o seu
cache.

| Query          | `staleTime` | Retry                          | Observações                                                                              |
| -------------- | ----------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| Padrão         | 30 s        | 1                              | `gcTime` de 5 min; sem refetch ao focar a janela (o socket cuida da frescura)            |
| Sessão         | infinito    | 1                              | Só muda por login, logout ou 401                                                         |
| Catálogo       | 30 s        | 1                              | `placeholderData: keepPreviousData`, mantendo a lista anterior durante a troca de filtro |
| Detalhe do NFT | 30 s        | nenhum em 404                  | Um 404 é definitivo                                                                      |
| Carrinho       | 15 s        | 1                              |                                                                                          |
| Cotação        | 0           | 1                              | Sempre buscada de novo ao abrir carrinho e checkout                                      |
| Pedido         | padrão      | até 2, só em falha transitória | Polling de 3 s enquanto está `pending`, como reserva caso um evento se perca             |
| Mutations      | —           | nenhum                         | Exceto `POST /orders`, abaixo                                                            |

- **Respostas obsoletas:** toda query repassa o `signal` do TanStack Query ao Axios. Quando os parâmetros mudam, a
  requisição anterior é cancelada; e, como a chave muda, uma resposta atrasada nunca é gravada no lugar da busca atual. O
  cenário `out-of-order` e um teste E2E cobrem isso.
- **Invalidação depois de mutations:** as mutations de carrinho gravam a resposta (o carrinho completo) direto no cache e
  invalidam a cotação. Perfil e carteiras fazem o mesmo com as próprias chaves. O checkout invalida o carrinho quando
  recebe um conflito de cotação.
- **Atualização otimista:** favoritar, em [use-favorites.ts](src/features/favorites/use-favorites.ts). `onMutate` cancela
  as buscas em andamento, guarda o estado anterior e aplica a mudança. `onError` restaura o snapshot e avisa, e
  `onSettled` revalida. O cenário `favorites-error` exercita o rollback.
- **Estados de tela:** cada consulta tem skeleton com shimmer nas dimensões do conteúdo final, estado vazio, erro com
  "Tentar novamente" e atualização em segundo plano (a lista antiga fica visível, sem piscar).

## 7. Reconciliação entre REST e Socket.IO

O REST é a fonte da verdade. O socket é um atalho para não esperar o próximo refetch.

1. **Versões.** NFTs e pedidos têm `version`, que aumenta a cada mudança. Um evento só é aplicado se a versão dele for
   maior que a do dado em cache, mesmo que esse dado tenha vindo do REST. Uma resposta REST sempre substitui o cache,
   porque é a fonte da verdade.
2. **Eventos aplicados no cache.** `nft.updated` corrige preço e estoque em todas as listas que contêm o NFT. Quando o NFT
   está no carrinho, o evento não tenta recalcular o resumo: invalida carrinho e cotação e deixa a API responder.
3. **Reconexão.** Ao reconectar, todas as queries ativas são refeitas. O que mudou durante a queda chega pelo REST, mesmo
   sem nenhum evento.
4. **Pedido pendente.** O pedido em andamento fica em `kurio.pendingOrder`. Depois de um refresh, de uma queda ou de abrir
   outra aba, um aviso global leva ao pedido. A página do pedido lê `GET /orders/:id` e mantém polling até um estado
   terminal. O servidor liquida pedidos vencidos tanto num intervalo quanto antes de cada leitura, então o estado avança
   mesmo que nenhum evento chegue. Pedidos `confirmed` e `rejected` são terminais.
5. **Cotação desatualizada.** Se o preço muda com o checkout aberto, o evento invalida a cotação. Ao confirmar, o servidor
   compara a impressão digital da cotação enviada com a vigente e responde `quote_changed` com a cotação nova. A tela
   mostra o antes e depois e exige uma nova confirmação.

## 8. Checkout e idempotência

[use-place-order.ts](src/features/checkout/use-place-order.ts):

- **Revisão antes do envio.** "Revisar e confirmar compra" valida o formulário, exige a carteira conectada e busca uma
  cotação nova. A revisão mostra o resumo dessa cotação, e "Confirmar compra" envia o pedido com o `quoteId`.
- **Uma chave por tentativa.** A tentativa (chave UUID, corpo e `userId`) é gravada em `kurio.checkoutAttempt` antes do
  envio. Reenviar a mesma tentativa usa sempre a mesma chave. Uma nova confirmação, depois de mudar os valores, gera uma
  chave nova.
- **Clique repetido.** O botão é travado enquanto o envio está pendente, e a mutation roda em `scope` serial: nunca há dois
  `POST /orders` ao mesmo tempo.
- **Timeout e rede.** São reenviados até 3 vezes com backoff (1 s, 2 s e 4 s), sempre com a mesma chave. O servidor
  responde 200 com o pedido já criado. O cenário `order-timeout` cria o pedido e segura a primeira resposta por 12 s,
  além do timeout de 10 s do cliente.
- **Conflito de chave.** A mesma chave com outro corpo, ou de outro usuário, responde 409 `idempotency_conflict`.
- **No servidor**, o pedido revalida carrinho, estoque, cupom, taxa e validade da cotação. Depois reserva o estoque e
  nasce `pending`; a liquidação acontece depois de 2,5 s no cenário padrão.
- **Confirmação** só aparece para um pedido `confirmed` lido da API. O recibo usa o snapshot gravado no pedido (itens,
  preços, cupom, taxa, carteira e hash) e nunca relê o catálogo.

## 9. Backend simulado

- **DB** ([src/mocks/db](src/mocks/db)): um estado único com catálogo, usuários, sessões, carrinhos, favoritos, cupons,
  cotações, pedidos, idempotência e carteiras. Fica persistido em `localStorage` (`kurio.mocks.db`, com `schemaVersion`).
  Toda escrita passa por `db.write`, que persiste em seguida. Outra aba que altere o DB atualiza este estado pelo evento
  `storage`.
- **Seed determinístico:** 48 NFTs, sendo os 9 primeiros os cards do Figma e o resto gerado com semente fixa (coleções,
  redes, faixa de preço de 0,02 a 12,30 ETH, edições, promoções, raridade e edições esgotadas). Também tem 2 usuários e 3
  cupons. Senhas ficam como SHA-256 com salt.
- **Cenários** ([src/mocks/scenarios.ts](src/mocks/scenarios.ts)): latência (`none`, `fixed` ou `random` com semente),
  offline, regras de falha por método e prefixo de caminho (status ou erro de rede, sempre ou N vezes), catálogo vazio ou
  fora de ordem, resultado do pagamento e atraso da liquidação, timeout do pedido, preço ou estoque alterado no checkout,
  recusa da carteira e duração da sessão. A configuração também fica persistida e é reaplicada no boot.
- **Controle** ([src/mocks/control.ts](src/mocks/control.ts)): `window.__kurioMocks` serve ao painel e ao Playwright.
  Tudo o que ele faz altera o "servidor" (o DB e os eventos), nunca a interface.
- **Servidor Socket.IO** ([src/mocks/realtime.ts](src/mocks/realtime.ts)): `ws.link` do MSW mais
  `@mswjs/socket.io-binding`.

## 10. Transporte do tempo real e limitações dos mocks

- **Só WebSocket.** O MSW intercepta `WebSocket`, e o binding fala o protocolo Socket.IO/Engine.IO por cima dele. O
  cliente usa `transports: ['websocket']`, sem long-polling, porque o polling do Engine.IO seria HTTP e não passaria pelo
  binding.
- **Carregamento sob demanda.** O `engine.io-client` guarda uma referência ao `WebSocket` global quando o módulo é
  avaliado. Se ele carregar antes de o MSW substituir o `WebSocket`, conecta ao host real, que não existe. Por isso
  `socket.io-client` é importado dinamicamente depois de `networkReady`, o que também o tira do bundle inicial.
- **Pings.** O binding não envia pings do Engine.IO, e sem eles o cliente derruba a conexão por timeout. O servidor
  simulado envia um ping a cada 20 s.
- **Uma instância por aba.** Cada aba tem o seu servidor simulado. O DB é compartilhado pelo `localStorage`, mas os
  eventos não cruzam abas: uma compra feita numa aba aparece na outra no próximo refetch, não por evento.
- **Dados no navegador.** Cada visitante do deploy tem o seu próprio "backend", e a cota do `localStorage` (cerca de
  5 MB) limita o DB; por isso o avatar tem no máximo 512 KB. O token também fica no `localStorage`. Num backend real ele
  iria num cookie `httpOnly`.
- **Service worker.** O MSW exige contexto seguro (HTTPS ou `localhost`). Numa aba anônima com cookies bloqueados, ou com
  o service worker desabilitado, a API simulada não sobe.
- **tough-cookie.** O MSW traz o `tough-cookie` (com a lista de sufixos públicos do `tldts`) para emular cookies. A API usa
  Bearer e nunca define cookies, então o pacote foi trocado por um stub
  ([src/mocks/vendor/tough-cookie.ts](src/mocks/vendor/tough-cookie.ts)) via alias no Vite. O chunk dos mocks caiu de
  464 KB para 181 KB. Uma requisição com `Set-Cookie` não teria o cookie guardado pelo mock.
- **Blockchain simulada.** Hash da transação e link do explorer (Sepolia Etherscan) são gerados ao acaso; o link abre o
  explorer, mas a transação não existe lá. Conexão de carteira, assinatura e taxa de rede são simulações.

## 11. Acessibilidade

- Link "Pular para o conteúdo", foco visível em todos os controles e navegação completa por teclado.
- Diálogos e gavetas (Base UI) prendem o foco, fecham com Esc e devolvem o foco ao gatilho.
- Formulários: `label` em todos os campos, erro ligado por `aria-describedby` e `aria-invalid`, e foco no primeiro
  campo inválido. Os erros da API usam o mesmo caminho.
- Feedback de mutations e de tempo real por toasts (região `aria-live`) e por avisos `role="status"` no carrinho e no
  checkout. Mudanças de preço e estoque são anunciadas, e não só coloridas.
- Estados não dependem só de cor: edição esgotada vem riscada e com texto, e o item alterado mostra "de X para Y".
- Skeletons e animações respeitam `prefers-reduced-motion`.
- Sem overflow horizontal em 390, 768 e 1440 px, verificado por teste.
- Ajustes de contraste em relação ao layout:
  - o vermelho "Error" do Figma (`#ED1B2E`) tem 4,39:1 sobre o fundo e 4,0:1 sobre os cards, abaixo de 4,5:1, então as
    mensagens de erro usam o "Text/Coral" da própria paleta (`#F0805F`, 7,29:1);
  - os botões laranja usam texto escuro (`#140D0A` sobre `#D28A4C`, 6,85:1); com texto claro seria 2,54:1;
  - os pontos do carrossel do hero têm área de toque de 24 × 24 px, embora o ponto visível tenha 8 px.

Um bug ligado ao contraste merece registro. A escala tipográfica própria (`text-body-lg`, `text-title`…) era tratada pelo
`tailwind-merge` como cor de texto, e o `cn()` descartava o `text-primary-foreground` dos botões grandes. A escala agora é
declarada em [src/lib/utils.ts](src/lib/utils.ts).

## 12. Performance

Os resultados e o método estão em [lighthouse/README.md](lighthouse/README.md), e a auditoria do deploy publicado em
[lighthouse/deploy/](lighthouse/deploy/README.md). O que pesou:

- O app renderiza sem esperar o MSW, e o chunk dos mocks recebe `modulepreload` para baixar em paralelo com o bundle
  principal (plugin `preloadMocks` em [vite.config.ts](vite.config.ts)).
- As rotas usam code splitting automático do TanStack Router, e `socket.io-client` sai do bundle inicial.
- Artes em AVIF e WebP com `srcset` e `sizes` pela largura real do card, dimensões fixas e `fetchpriority` na imagem do LCP.
- Roboto Mono servida localmente, com `font-display: swap` e preload.
- `main` com altura mínima da tela, para o rodapé não saltar quando o conteúdo carrega (CLS).
- Na Vercel, cache imutável para `/assets` e de 7 dias para imagens e fontes.

A auditoria usa um servidor local com HTTP/2, brotli e os cabeçalhos do `vercel.json`, e não o `vite preview`. Em HTTP/1.1
a simulação do Lighthouse limita 6 conexões por origem e cobra round-trips por chunk que não existem no deploy.

## 13. Decisões de UX

- **Login e cadastro** têm URL própria (`/entrar` e `/cadastro`, com `?redirect=`). No desktop abrem como modal sobre a
  página de origem, com as abas do Figma; no mobile, em tela cheia.
- **Lista de interesse** (`/favoritos`): não está na lista de telas obrigatórias, mas o coração da navegação mobile e o
  item "Lista de interesse" do perfil precisavam de um destino.
- **Estado na URL:** filtros, busca, aba, ordenação e página do catálogo, e a edição no detalhe (`?edition=1-10`). Valores
  inválidos voltam ao padrão em vez de quebrar a página. Mudar qualquer filtro volta para a página 1.
- **Comprar** no detalhe adiciona o item e vai ao carrinho. O botão de carrinho só adiciona.
- **Etapa de revisão:** o botão do formulário diz "Revisar e confirmar compra" e abre a revisão com o "Confirmar compra"
  final, porque o enunciado pede revisão antes do envio.
- **Ações fora do escopo** (Criadores, Aprenda, Atividade, Ofertas, Arquivos baixados, Suporte, login social, recuperação
  de senha, newsletter e posts do blog) mostram "… ainda não está disponível nesta versão" e não simulam sucesso. Links
  externos, como redes sociais e compartilhar, abrem de verdade em outra aba.
- **Toasts** ficam no topo no mobile, abaixo da barra superior, para não cobrir a barra fixa de compra. No desktop ficam
  no canto inferior direito.
- **Painel de cenários** visível também no deploy. O build publicado é o build de demonstração, e o painel é a forma de o
  avaliador exercitar as falhas sem abrir o console.
- **Rascunho do checkout** salvo localmente: sobrevive a refresh e à expiração da sessão, mas é apagado no logout.

## 14. Desvios do Figma

| Onde                                      | No Figma                                                                      | Na implementação                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Badge do carrinho                         | Mostra "6" com 17 itens no carrinho                                           | Soma das quantidades (`itemCount` da API)                                                 |
| Carrinho mobile                           | Subtotal 8.92 com itens que somam 8.14                                        | Valores sempre da cotação da API                                                          |
| IDs de token                              | Mudam entre telas (Violet Nomad #0009 e #0314, Ivory Baron #0552 e #0088)     | Um ID por NFT, igual em todas as telas                                                    |
| Grid da Home                              | Um card sem nome nem preço, e imagens desalinhadas                            | Todos os cards completos e alinhados                                                      |
| Detalhe mobile                            | Edições duplicadas ("1/10 1/10")                                              | Cada edição aparece uma vez                                                               |
| Carrinho mobile                           | Lixeira sobreposta ao botão "+"                                               | Lixeira e seletor de quantidade separados                                                 |
| Perfil e Carteiras                        | Item ativo da navegação principal é "Início"                                  | Nenhum item da navegação principal fica ativo; o ativo é o da barra lateral do perfil     |
| Busca no desktop                          | O frame desktop não tem campo de busca no catálogo                            | Busca abaixo das abas do catálogo; a lupa do header leva até ela                          |
| Hero                                      | Texto diferente no desktop ("…arte digital") e no mobile ("…cultura digital") | Mantido como no Figma                                                                     |
| Carrinho                                  | "Resumo da carteira"                                                          | "Resumo do pedido", que descreve o bloco                                                  |
| Pagamento                                 | Botão "Confirmar compra" direto                                               | "Revisar e confirmar compra" e, na revisão, "Confirmar compra"                            |
| Cor de erro e texto de botão              | Vermelho `#ED1B2E`                                                            | Coral `#F0805F` e texto escuro nos botões laranja (seção 11)                              |
| Perfil, Carteiras e Confirmação no mobile | Sem frame                                                                     | Mesmos componentes do desktop em uma coluna; a barra lateral do perfil vira abas roláveis |
| Telas não desenhadas                      | Estados de carregamento, vazio, erro, pendente, recusado, 404                 | Seguem os mesmos tokens, tipografia e componentes                                         |

**Assets.** As quatro ilustrações do Figma (Emerald Ape, Baron Ape, Golden Ape e Nomad Gorilla) foram exportadas em
1254 px e ficam em `design/originals`. `pnpm images` gera as variantes AVIF e WebP em `public/images`. Como o Figma só tem
essas quatro artes, os 48 NFTs do catálogo, os destaques e o blog as reutilizam. Ícones vêm do `lucide-react`, e os logos
das redes sociais e do login social são SVGs próprios. A fonte é a Roboto Mono (licença OFL incluída em `public/fonts`).
