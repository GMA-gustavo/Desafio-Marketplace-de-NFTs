# Resultados do Lighthouse

Gerado por `node scripts/lighthouse.mjs --url https://kurio-marketplace-omega.vercel.app --out lighthouse/deploy` em 2026-10-29T19:11:59.953Z. Mediana de 3 execuções por linha.

Metas: Performance ≥ 90 · Acessibilidade ≥ 95 · Boas práticas ≥ 95 · SEO ≥ 90.

| Página         | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP    | CLS   | TBT    | Relatório                                                                   |
| -------------- | ----------- | ----------- | -------------- | ------------- | --- | ------ | ----- | ------ | --------------------------------------------------------------------------- |
| Início         | Mobile      | 91          | 100            | 100           | 100 | 2.97 s | 0.000 | 0.23 s | [HTML](reports/inicio-mobile.html) · [JSON](reports/inicio-mobile.json)     |
| Início         | Desktop     | 100         | 100            | 100           | 100 | 0.60 s | 0.010 | 0.00 s | [HTML](reports/inicio-desktop.html) · [JSON](reports/inicio-desktop.json)   |
| Detalhe do NFT | Mobile      | 93          | 100            | 100           | 100 | 2.74 s | 0.000 | 0.20 s | [HTML](reports/detalhe-mobile.html) · [JSON](reports/detalhe-mobile.json)   |
| Detalhe do NFT | Desktop     | 100         | 100            | 100           | 100 | 0.59 s | 0.006 | 0.00 s | [HTML](reports/detalhe-desktop.html) · [JSON](reports/detalhe-desktop.json) |

## Execuções individuais

| Página         | Dispositivo | Execução | Perf. | A11y | BP  | SEO | LCP    | CLS   | TBT    |
| -------------- | ----------- | -------- | ----- | ---- | --- | --- | ------ | ----- | ------ |
| Início         | Mobile      | 1        | 81    | 100  | 100 | 100 | 3.12 s | 0.000 | 0.30 s |
| Início         | Mobile      | 2        | 91    | 100  | 100 | 100 | 2.97 s | 0.000 | 0.23 s |
| Início         | Mobile      | 3        | 93    | 100  | 100 | 100 | 2.90 s | 0.000 | 0.15 s |
| Início         | Desktop     | 1        | 100   | 100  | 100 | 100 | 0.62 s | 0.010 | 0.00 s |
| Início         | Desktop     | 2        | 100   | 100  | 100 | 100 | 0.60 s | 0.010 | 0.00 s |
| Início         | Desktop     | 3        | 100   | 100  | 100 | 100 | 0.60 s | 0.010 | 0.00 s |
| Detalhe do NFT | Mobile      | 1        | 93    | 100  | 100 | 100 | 2.74 s | 0.000 | 0.20 s |
| Detalhe do NFT | Mobile      | 2        | 95    | 100  | 100 | 100 | 2.73 s | 0.000 | 0.11 s |
| Detalhe do NFT | Mobile      | 3        | 92    | 100  | 100 | 100 | 2.74 s | 0.000 | 0.22 s |
| Detalhe do NFT | Desktop     | 1        | 100   | 100  | 100 | 100 | 0.60 s | 0.006 | 0.00 s |
| Detalhe do NFT | Desktop     | 2        | 100   | 100  | 100 | 100 | 0.59 s | 0.006 | 0.00 s |
| Detalhe do NFT | Desktop     | 3        | 100   | 100  | 100 | 100 | 0.58 s | 0.006 | 0.00 s |

## Ambiente

- Alvo: https://kurio-marketplace-omega.vercel.app
- Lighthouse 13.6.0 · HeadlessChrome/156.0.8078.4
- Node v24.11.1 · Windows_NT 10.0.26300 (x64)
- CPU: AMD Ryzen 7 5700X3D 8-Core Processor (16 núcleos) · RAM: 16 GB · benchmarkIndex mediano: 2744
- Mobile: configuração padrão do Lighthouse (Moto G Power emulado, 4× CPU, rede 4G lenta simulada).
- Desktop: `desktop-config` do Lighthouse (1350×940, rede e CPU de desktop simuladas).
- Cada execução abre um Chrome com perfil limpo: o service worker do MSW é registrado do zero, como numa primeira visita.
- Com os mocks ligados (como no deploy), a API simulada responde com a latência do cenário padrão (120–450 ms).
