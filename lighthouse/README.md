# Resultados do Lighthouse

Gerado por `pnpm lighthouse` em 2026-10-28T20:13:40.825Z. Mediana de 3 execuções por linha.

Metas: Performance ≥ 90 · Acessibilidade ≥ 95 · Boas práticas ≥ 95 · SEO ≥ 90.

| Página         | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP    | CLS   | TBT    | Relatório                                                                   |
| -------------- | ----------- | ----------- | -------------- | ------------- | --- | ------ | ----- | ------ | --------------------------------------------------------------------------- |
| Início         | Mobile      | 95          | 100            | 100           | 100 | 2.56 s | 0.019 | 0.16 s | [HTML](reports/inicio-mobile.html) · [JSON](reports/inicio-mobile.json)     |
| Início         | Desktop     | 100         | 100            | 100           | 100 | 0.54 s | 0.011 | 0.00 s | [HTML](reports/inicio-desktop.html) · [JSON](reports/inicio-desktop.json)   |
| Detalhe do NFT | Mobile      | 97          | 100            | 100           | 100 | 2.41 s | 0.000 | 0.10 s | [HTML](reports/detalhe-mobile.html) · [JSON](reports/detalhe-mobile.json)   |
| Detalhe do NFT | Desktop     | 100         | 100            | 100           | 100 | 0.52 s | 0.003 | 0.00 s | [HTML](reports/detalhe-desktop.html) · [JSON](reports/detalhe-desktop.json) |

## Execuções individuais

| Página         | Dispositivo | Execução | Perf. | A11y | BP  | SEO | LCP    | CLS   | TBT    |
| -------------- | ----------- | -------- | ----- | ---- | --- | --- | ------ | ----- | ------ |
| Início         | Mobile      | 1        | 94    | 100  | 100 | 100 | 2.56 s | 0.019 | 0.19 s |
| Início         | Mobile      | 2        | 96    | 100  | 100 | 100 | 2.56 s | 0.019 | 0.14 s |
| Início         | Mobile      | 3        | 95    | 100  | 100 | 100 | 2.55 s | 0.019 | 0.16 s |
| Início         | Desktop     | 1        | 100   | 100  | 100 | 100 | 0.54 s | 0.011 | 0.00 s |
| Início         | Desktop     | 2        | 100   | 100  | 100 | 100 | 0.54 s | 0.011 | 0.00 s |
| Início         | Desktop     | 3        | 100   | 100  | 100 | 100 | 0.54 s | 0.011 | 0.00 s |
| Detalhe do NFT | Mobile      | 1        | 95    | 100  | 100 | 100 | 2.41 s | 0.000 | 0.19 s |
| Detalhe do NFT | Mobile      | 2        | 97    | 100  | 100 | 100 | 2.41 s | 0.000 | 0.10 s |
| Detalhe do NFT | Mobile      | 3        | 97    | 100  | 100 | 100 | 2.40 s | 0.000 | 0.10 s |
| Detalhe do NFT | Desktop     | 1        | 100   | 100  | 100 | 100 | 0.52 s | 0.003 | 0.00 s |
| Detalhe do NFT | Desktop     | 2        | 100   | 100  | 100 | 100 | 0.52 s | 0.003 | 0.00 s |
| Detalhe do NFT | Desktop     | 3        | 100   | 100  | 100 | 100 | 0.52 s | 0.003 | 0.00 s |

## Ambiente

- Alvo: build de produção local (HTTP/2 com TLS, brotli, cache imutável e fallback SPA)
- Lighthouse 13.6.0 · HeadlessChrome/156.0.8078.4
- Node v24.11.1 · Windows_NT 10.0.26300 (x64)
- CPU: AMD Ryzen 7 5700X3D 8-Core Processor (16 núcleos) · RAM: 16 GB · benchmarkIndex mediano: 2896
- Mobile: configuração padrão do Lighthouse (Moto G Power emulado, 4× CPU, rede 4G lenta simulada).
- Desktop: `desktop-config` do Lighthouse (1350×940, rede e CPU de desktop simuladas).
- Cada execução abre um Chrome com perfil limpo: o service worker do MSW é registrado do zero, como numa primeira visita.
- Com os mocks ligados (como no deploy), a API simulada responde com a latência do cenário padrão (120–450 ms).

## Por que um servidor próprio

O `vite preview` serve em HTTP/1.1 e sem compressão. Nesse cenário o Lighthouse simula no máximo 6 conexões
por origem, e cada chunk do code splitting paga round-trips de 150 ms que não existem na Vercel, que serve em
HTTP/2 com brotli. O script sobe um servidor que reproduz o deploy: HTTP/2 (TLS autoassinado), arquivos
pré-comprimidos, os mesmos cabeçalhos de cache do `vercel.json` e fallback SPA. A auditoria do deploy publicado
está em [deploy/](deploy/README.md) e é refeita com
`node scripts/lighthouse.mjs --url https://<deploy> --out lighthouse/deploy`.
