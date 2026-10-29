# Kurio — Marketplace de NFTs

Solução do [desafio frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge), implementada a partir do
[layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge). Ela cobre descoberta, compra e conta
do colecionador, em desktop e mobile, com um backend inteiro simulado na camada de rede (MSW + Socket.IO).

- **Aplicação publicada:** <https://kurio-marketplace-omega.vercel.app>
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Auditoria Lighthouse:** [lighthouse/README.md](lighthouse/README.md)

## Stack

| Responsabilidade       | Tecnologia                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| Interface e linguagem  | React 19 · TypeScript (strict)                                          |
| Build                  | Vite 8 · pnpm                                                           |
| Roteamento             | TanStack Router (rotas por arquivo, search params validados com zod)    |
| Estado remoto          | TanStack Query                                                          |
| Cliente HTTP           | Axios (REST)                                                            |
| Tempo real             | Socket.IO (`socket.io-client`)                                          |
| Estilo e componentes   | Tailwind CSS v4 · shadcn/ui (sobre Base UI)                             |
| Mocks                  | MSW 2 · `@mswjs/socket.io-binding`                                      |
| Formulários e contrato | react-hook-form · zod (os mesmos schemas no cliente, no mock e na tela) |
| Valores em ETH         | big.js (strings decimais, sem ponto flutuante)                          |
| Testes                 | Playwright (E2E e regressão visual)                                     |
| Auditoria              | Lighthouse 13                                                           |

## Setup

Requisitos: **Node 22 ou mais novo** (testado no 24.11.1) e **pnpm 10** (a versão exata está em `packageManager`; com o
Corepack, `corepack enable` basta).

```bash
git clone https://github.com/GMA-gustavo/Desafio-Marketplace-de-NFTs.git
cd Desafio-Marketplace-de-NFTs
pnpm install
pnpm dev
```

O app abre em `http://localhost:5173`, com os mocks ligados. Nenhum serviço externo nem arquivo `.env` é necessário.

### Variáveis de ambiente

Todas são opcionais. Os valores padrão estão em [.env.example](.env.example) e em [src/lib/env.ts](src/lib/env.ts).

| Variável            | Padrão                       | Para que serve                                                                                               |
| ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `VITE_API_URL`      | `/api`                       | Base das chamadas REST. Com os mocks ativos, o MSW intercepta tudo abaixo desse caminho.                     |
| `VITE_SOCKET_URL`   | `wss://realtime.kurio.local` | Origem do servidor Socket.IO. Com os mocks ativos, o MSW intercepta o WebSocket; o host não precisa existir. |
| `VITE_ENABLE_MOCKS` | `true`                       | Liga a API simulada. Fica ativa também no build de produção, que é o build de demonstração publicado.        |

## Comandos

| Comando                | O que faz                                                                        |
| ---------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`             | Desenvolvimento com mocks, em `localhost:5173`                                   |
| `pnpm build`           | Gera as rotas, checa os tipos e faz o build de produção em `dist/`               |
| `pnpm preview`         | Serve o build em `localhost:4173`                                                |
| `pnpm typecheck`       | Checagem de tipos                                                                |
| `pnpm lint`            | oxlint em `src` e `tests`                                                        |
| `pnpm format:check`    | Prettier (`pnpm format` corrige)                                                 |
| `pnpm test:e2e`        | Suíte Playwright, desktop e mobile; sobe o build sozinho                         |
| `pnpm test:e2e:update` | Regrava as baselines visuais que falharam                                        |
| `pnpm test:e2e:report` | Abre o relatório HTML da última execução                                         |
| `pnpm lighthouse`      | Build + auditoria Lighthouse (início e detalhe × mobile e desktop × 3 execuções) |
| `pnpm images`          | Regera as variantes AVIF/WebP das artes a partir de `design/originals`           |

## Credenciais fictícias

| Usuário           | E-mail            | Senha        | Situação no seed                                                 |
| ----------------- | ----------------- | ------------ | ---------------------------------------------------------------- |
| Ana Colecionadora | `ana@kurio.dev`   | `Kurio@2026` | Duas carteiras cadastradas e dois favoritos; pronta para comprar |
| Bruno Ferreira    | `bruno@kurio.dev` | `Kurio@2026` | Sem carteiras e sem favoritos; bom para os estados vazios        |

As senhas ficam no mock só como hash SHA-256 com salt (WebCrypto). Também é possível criar contas novas em `/cadastro`.

Cupons: `KURIO10` (10%), `GENESIS15` (15%) e `VERAO2025` (expirado). Qualquer outro código é recusado como inválido.

## Cenários da simulação

O backend simulado tem 16 cenários prontos. Eles alteram as próximas respostas da API e do socket, sem recarregar a página.

| Cenário                 | Efeito                                                                      |
| ----------------------- | --------------------------------------------------------------------------- |
| `default`               | Latência realista (120–450 ms, semente fixa) e pagamento aprovado           |
| `fast`                  | Sem latência (usado pelos testes)                                           |
| `slow`                  | Toda resposta leva 2,5 s; os skeletons ficam visíveis                       |
| `variable-latency`      | Latência entre 100 ms e 3 s, com semente fixa                               |
| `out-of-order`          | As buscas do catálogo alternam 1,5 s e 150 ms, então chegam fora de ordem   |
| `empty-catalog`         | A listagem não retorna NFTs                                                 |
| `offline`               | Toda chamada falha na rede e o socket cai                                   |
| `catalog-error`         | `GET /nfts` responde 500 até trocar de cenário                              |
| `flaky`                 | A primeira leitura de cada endpoint responde 503; a nova tentativa funciona |
| `favorites-error`       | Favoritar e desfavoritar respondem 500                                      |
| `short-session`         | Sessões expiram 1 minuto após o login                                       |
| `price-change-checkout` | Ao confirmar a compra, o preço do primeiro item sobe 10%                    |
| `sold-out-checkout`     | Ao confirmar a compra, a edição do primeiro item esgota                     |
| `order-timeout`         | O pedido é criado, mas a resposta passa do timeout de 10 s do cliente       |
| `payment-rejected`      | A simulação recusa o pagamento                                              |
| `wallet-rejected`       | A carteira recusa a conexão                                                 |

### Como escolher

- **Painel na própria aplicação:** o botão com ícone de frasco (canto inferior esquerdo no desktop, borda esquerda no
  mobile) abre "Cenários de simulação". Ali também ficam os gatilhos de eventos: alterar o preço ou esgotar o primeiro
  item do carrinho, expirar a sessão, derrubar o socket, reenviar o último evento e liquidar pedidos pendentes.
- **Pela URL:** `?scenario=<nome>` em qualquer rota, por exemplo `/?scenario=slow`. A escolha fica salva até ser trocada.
- **Pelo console ou pelo Playwright:** `window.__kurioMocks` expõe a mesma API do painel, por exemplo
  `__kurioMocks.setScenario('payment-rejected')`, e permite ajustes finos com
  `__kurioMocks.patchConfig({ payment: { outcome: 'confirmed', delayMs: 30000 } })`.

### Reset

"Restaurar dados iniciais (reset)", no fim do painel, ou `__kurioMocks.reset()` no console. O reset recria o seed
determinístico (catálogo, usuários, carrinhos, pedidos e carteiras), apaga sessão, carrinho de visitante, rascunho e
pedido pendente guardados no navegador e recarrega a página. O cenário escolhido é mantido. Limpar o `localStorage` do
site tem o mesmo efeito e também volta ao cenário `default`.

## Como reproduzir os fluxos de falha

Para os fluxos de compra, entre como a Ana e coloque algum NFT no carrinho.

| Fluxo                                | Como reproduzir                                                                                                                                                    | O que se espera                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Carregamento lento                   | Cenário `slow` e navegue pelo início, detalhe e carrinho                                                                                                           | Skeletons com shimmer no tamanho final do conteúdo                                                                        |
| Respostas fora de ordem              | Cenário `out-of-order` e troque filtros ou digite na busca rapidamente                                                                                             | A lista mostra sempre o resultado da busca mais recente                                                                   |
| Erro do servidor e nova tentativa    | Cenário `catalog-error`; volte para `default` e clique em "Tentar novamente"                                                                                       | Mensagem de erro e, depois, o catálogo recuperado                                                                         |
| Falha transitória                    | Cenário `flaky`                                                                                                                                                    | O app tenta de novo sozinho e a tela carrega normalmente                                                                  |
| Sem conexão                          | Cenário `offline`                                                                                                                                                  | Erros de rede com "Tentar novamente" e o socket em reconexão                                                              |
| Resultado vazio                      | Cenário `empty-catalog`, ou uma busca sem resultado                                                                                                                | Estado vazio com "Limpar filtros"                                                                                         |
| Rollback de favorito                 | Cenário `favorites-error` e clique no coração de um NFT                                                                                                            | O coração muda na hora, volta ao estado anterior e um aviso explica a falha                                               |
| Conflito no cadastro                 | Crie uma conta com `ana@kurio.dev` ou com o usuário `ana.kurio`                                                                                                    | Erro no próprio campo                                                                                                     |
| Sessão expirada na navegação         | Painel → "Expirar sessão agora" e navegue para uma tela privada (ou use `short-session` e espere 1 minuto)                                                         | Aviso, login com retorno para a mesma tela e carrinho preservado                                                          |
| Sessão expirada no checkout          | Preencha `/pagamento`, expire a sessão pelo painel e clique em "Revisar e confirmar compra"                                                                        | Depois do novo login, o formulário volta preenchido                                                                       |
| Cupom inválido ou expirado           | Aplique `NAOEXISTE` ou `VERAO2025` no carrinho                                                                                                                     | Erro no campo do cupom; o resumo não muda                                                                                 |
| Preço ou estoque muda no carrinho    | Com o carrinho aberto, painel → "Alterar preço do 1º item" ou "Esgotar edição do 1º item"                                                                          | Aviso no topo e no item, toast e resumo recalculado; com a edição esgotada, o checkout fica bloqueado                     |
| Preço muda durante a compra          | Cenário `price-change-checkout` e confirme a compra na revisão                                                                                                     | Diálogo "Os valores mudaram" com o antes e depois; o pedido só sai depois de uma nova confirmação                         |
| Edição esgota durante a compra       | Cenário `sold-out-checkout` e confirme a compra                                                                                                                    | O diálogo "Os valores mudaram" marca o item como esgotado e só oferece "Voltar ao carrinho"; nenhum pedido é criado       |
| Carteira recusa a conexão            | Cenário `wallet-rejected` e conecte a carteira no pagamento; depois volte para `default` e conecte de novo                                                         | Erro da recusa e, depois, a carteira conectada                                                                            |
| Clique repetido                      | Clique várias vezes em "Confirmar compra"                                                                                                                          | Um único pedido criado                                                                                                    |
| Timeout após criar o pedido          | Cenário `order-timeout` e confirme a compra                                                                                                                        | Aos 10 s a tela avisa que está verificando se o pedido já foi criado; o reenvio com a mesma chave recupera o mesmo pedido |
| Pagamento recusado                   | Cenário `payment-rejected` e confirme a compra                                                                                                                     | Pedido "Pagamento recusado", itens ainda no carrinho e estoque devolvido                                                  |
| Queda de conexão com pedido pendente | `__kurioMocks.patchConfig({ payment: { outcome: 'confirmed', delayMs: 30000 } })`, confirme a compra e use "Derrubar conexão em tempo real" ou recarregue a página | O pedido segue pendente, é reconciliado via REST e confirma sem criar outra compra                                        |
| Eventos duplicados                   | Painel → "Reenviar último evento (duplicado)"                                                                                                                      | Nada muda: o cliente descarta o evento repetido                                                                           |
| Pedido de outro usuário              | Copie a URL de um pedido da Ana, entre como Bruno e abra a URL                                                                                                     | Mensagem de acesso negado (403)                                                                                           |
| Rota ou NFT inexistente              | Abra `/qualquer-coisa` ou `/nft/nao-existe`                                                                                                                        | Página 404 própria                                                                                                        |

## Testes (Playwright)

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

- O Playwright faz o build e o serve com `vite preview` na porta 4173, com os mocks ligados (o mesmo build publicado).
- São 52 cenários, rodados em dois projetos: `desktop-chromium` (1440 × 900) e `mobile-chromium` (Pixel 7). Alguns são
  exclusivos de um layout e aparecem como pulados no outro.
- Cada teste começa num contexto novo do navegador, ou seja, com o seed limpo. Cenário, latência, relógio (`page.clock`)
  e disparo de eventos são controlados por `window.__kurioMocks` (veja [tests/e2e/support/fixtures.ts](tests/e2e/support/fixtures.ts)).
  Tudo passa pelos handlers MSW e pelo `socket.io-client`, nunca por atalhos na interface.
- Em uma falha ficam guardados o trace, o vídeo e o screenshot em `test-results/`. O relatório HTML fica em
  `playwright-report/` (`pnpm test:e2e:report`).

**Regressão visual.** As baselines de início, detalhe, carrinho e pagamento ficam em `tests/e2e/__screenshots__/`, uma pasta por
projeto e sistema operacional (`desktop-chromium-win32`, `mobile-chromium-linux` etc.), porque a renderização de fontes
muda entre sistemas. Há baselines para Windows e para Linux; o CI usa as de Linux. Para regravá-las depois de uma mudança
intencional na interface:

```bash
pnpm test:e2e visual.spec.ts --update-snapshots=all
```

O `--update-snapshots=all` regrava também as baselines que ainda estão dentro da tolerância. O `pnpm test:e2e:update`
regrava só as que falharam.

**CI.** O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) roda lint, formatação, tipos e a suíte E2E no
Ubuntu 24.04 a cada push e pull request, e publica o relatório do Playwright como artefato.

## Lighthouse

```bash
pnpm lighthouse
```

O script [scripts/lighthouse.mjs](scripts/lighthouse.mjs) faz 3 execuções de início e detalhe do NFT, em mobile e desktop,
e guarda a mediana por categoria e métrica (LCP, CLS, TBT). Ele termina com erro se alguma mediana ficar abaixo da meta.
Os relatórios HTML/JSON, as versões das ferramentas e o ambiente ficam em [lighthouse/](lighthouse/README.md).

| Página  | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP    |
| ------- | ----------- | ----------- | -------------- | ------------- | --- | ------ |
| Início  | Mobile      | 94          | 100            | 100           | 100 | 2,59 s |
| Início  | Desktop     | 100         | 100            | 100           | 100 | 0,54 s |
| Detalhe | Mobile      | 96          | 100            | 100           | 100 | 2,52 s |
| Detalhe | Desktop     | 100         | 100            | 100           | 100 | 0,53 s |

Por padrão a auditoria roda contra o build local, servido por um servidor que reproduz a Vercel (HTTP/2, brotli e os
mesmos cabeçalhos de cache); a justificativa está no README da pasta.

O deploy publicado também foi auditado, com resultados em [lighthouse/deploy/](lighthouse/deploy/README.md). Os números
ficam próximos dos locais: Início mobile 91 (LCP 2,97 s), Detalhe mobile 93 (LCP 2,74 s) e 100 no desktop, com 100 em
acessibilidade, boas práticas e SEO em todas as linhas. Para refazer:

```bash
node scripts/lighthouse.mjs --url https://kurio-marketplace-omega.vercel.app --out lighthouse/deploy
```

`--runs <n>` muda o número de execuções e `--out <pasta>` muda onde os resultados são gravados.

## Deploy

O projeto está pronto para a Vercel com o preset **Vite**: build `pnpm build` e saída `dist`, sem variáveis de ambiente.
O [vercel.json](vercel.json) faz o fallback de SPA (acesso direto e refresh em qualquer rota) e define o cache dos assets.
Os mocks e o tempo real rodam no navegador, então o deploy é só estático.

## Estrutura

```
src/
  routes/      rotas do TanStack Router (uma por arquivo)
  features/    telas e hooks por domínio (catálogo, nft, carrinho, checkout, pedidos, auth, perfil, carteiras...)
  components/  ui/ (shadcn adaptado), layout, formulários e marca
  contracts/   schemas zod e tipos de cada recurso, erros e eventos
  api/         funções Axios por recurso e a fábrica de query keys
  realtime/    cliente Socket.IO e a ponte para o cache do TanStack Query
  lib/         http, erros, dinheiro, storage e utilitários
  mocks/       backend simulado: handlers MSW, serviços, DB com seed, cenários e servidor Socket.IO
tests/e2e/     suíte Playwright e baselines visuais
scripts/       auditoria Lighthouse e otimização de imagens
lighthouse/    relatórios versionados
design/        artes originais exportadas do Figma
```
