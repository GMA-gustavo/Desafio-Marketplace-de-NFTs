/**
 * Auditoria Lighthouse do build de produção.
 *
 *   pnpm lighthouse                       # build + auditoria local (servidor que imita a Vercel)
 *   pnpm lighthouse --url https://...     # audita um deploy
 *   pnpm lighthouse --runs 5              # outra quantidade de execuções
 *
 * Páginas: início e detalhe do NFT × mobile e desktop × N execuções (3 por padrão).
 * Cada execução usa um Chrome com perfil limpo (primeira visita: sem cache nem service worker).
 * Guarda a mediana de cada categoria e de cada métrica, e os relatórios HTML/JSON da execução
 * mediana em lighthouse/. Sai com código 1 se alguma mediana ficar abaixo da meta.
 */
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createSecureServer } from 'node:http2'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import zlib from 'node:zlib'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { computeMedianRun } from 'lighthouse/core/lib/median-run.js'
import selfsigned from 'selfsigned'

const ROOT = path.resolve(import.meta.dirname, '..')
const DIST = path.join(ROOT, 'dist')
const OUT = path.join(ROOT, 'lighthouse')

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    runs: { type: 'string', default: '3' },
  },
})
const RUNS = Number(args.runs)

const PAGES = [
  { id: 'inicio', name: 'Início', path: '/' },
  { id: 'detalhe', name: 'Detalhe do NFT', path: '/nft/emerald-ape-042' },
]
const FORM_FACTORS = [
  { id: 'mobile', name: 'Mobile', config: undefined },
  { id: 'desktop', name: 'Desktop', config: desktopConfig },
]
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
const METRICS = [
  { id: 'largest-contentful-paint', label: 'LCP', unit: 'ms' },
  { id: 'cumulative-layout-shift', label: 'CLS', unit: '' },
  { id: 'total-blocking-time', label: 'TBT', unit: 'ms' },
  { id: 'first-contentful-paint', label: 'FCP', unit: 'ms' },
  { id: 'speed-index', label: 'Speed Index', unit: 'ms' },
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// --- Servidor local que imita a Vercel: HTTP/2, brotli/gzip, cache imutável em /assets e
// fallback SPA. O HTTP/2 importa: em HTTP/1.1 o Lighthouse simula no máximo 6 conexões por
// origem, e os chunks do code splitting pagariam vários round-trips extras de 150 ms que não
// existem em produção. Navegador só fala HTTP/2 com TLS, então o certificado é autoassinado.

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt'])

/** Comprime tudo antes de servir (como a CDN): comprimir sob demanda atrasaria as respostas. */
function precompress() {
  const compressed = new Map()
  for (const entry of readdirSync(DIST, { recursive: true, withFileTypes: true })) {
    const file = path.join(entry.parentPath, entry.name)
    if (!entry.isFile() || !COMPRESSIBLE.has(path.extname(file))) continue
    const raw = readFileSync(file)
    compressed.set(`br:${file}`, zlib.brotliCompressSync(raw))
    compressed.set(`gzip:${file}`, zlib.gzipSync(raw))
  }
  return compressed
}

async function serveDist() {
  const compressed = precompress()
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { days: 1 })
  const tls = { key: pems.private, cert: pems.cert, allowHTTP1: true }
  const server = createSecureServer(tls, (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    let file = path.join(DIST, decodeURIComponent(pathname))
    if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
      file = path.join(DIST, 'index.html')
    }
    const ext = path.extname(file)
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
    // Mesmos cabeçalhos do vercel.json.
    res.setHeader(
      'Cache-Control',
      pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : /^\/(images|fonts)\//.test(pathname)
          ? 'public, max-age=604800'
          : 'public, max-age=0, must-revalidate',
    )
    const accept = String(req.headers['accept-encoding'] ?? '')
    if (COMPRESSIBLE.has(ext) && /\b(br|gzip)\b/.test(accept)) {
      const encoding = accept.includes('br') ? 'br' : 'gzip'
      res.setHeader('Content-Encoding', encoding)
      res.setHeader('Vary', 'Accept-Encoding')
      res.end(compressed.get(`${encoding}:${file}`))
      return
    }
    createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

// --- Auditoria

async function audit(url, formFactor) {
  // Chromium do Playwright; cada launch cria um perfil temporário vazio.
  const port = 9300 + Math.floor(Math.random() * 500)
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    // O certificado do servidor local é autoassinado.
    args: [`--remote-debugging-port=${port}`, ...(args.url ? [] : ['--ignore-certificate-errors'])],
  })
  try {
    const result = await lighthouse(
      url,
      { port, output: ['html', 'json'], logLevel: 'error', onlyCategories: CATEGORIES },
      formFactor.config,
    )
    if (!result) throw new Error(`Lighthouse não retornou resultado para ${url}`)
    if (result.lhr.runtimeError) throw new Error(result.lhr.runtimeError.message)
    return result
  } finally {
    await browser.close()
  }
}

function summarize(results) {
  const lhrs = results.map((r) => r.lhr)
  const scores = Object.fromEntries(
    CATEGORIES.map((id) => [id, Math.round(median(lhrs.map((l) => l.categories[id].score)) * 100)]),
  )
  const metrics = Object.fromEntries(
    METRICS.map((m) => [m.id, median(lhrs.map((l) => l.audits[m.id].numericValue))]),
  )
  const runs = lhrs.map((l) => ({
    scores: Object.fromEntries(
      CATEGORIES.map((id) => [id, Math.round(l.categories[id].score * 100)]),
    ),
    metrics: Object.fromEntries(METRICS.map((m) => [m.id, l.audits[m.id].numericValue])),
  }))
  return { scores, metrics, runs, medianRun: results[lhrs.indexOf(computeMedianRun(lhrs))] }
}

const fmtMetric = (m, value) =>
  m.unit === 'ms' ? `${(value / 1000).toFixed(2)} s` : value.toFixed(3)

function markdown(summary) {
  const lines = [
    '# Resultados do Lighthouse',
    '',
    `Gerado por \`pnpm lighthouse\` em ${summary.generatedAt}. Mediana de ${summary.runs} execuções por linha.`,
    '',
    `Metas: Performance ≥ ${TARGETS.performance} · Acessibilidade ≥ ${TARGETS.accessibility} · Boas práticas ≥ ${TARGETS['best-practices']} · SEO ≥ ${TARGETS.seo}.`,
    '',
    '| Página | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | Relatório |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const row of summary.results) {
    const score = (id) => `${row.scores[id]}${row.scores[id] < TARGETS[id] ? ' ⚠️' : ''}`
    const metric = (id) =>
      fmtMetric(
        METRICS.find((m) => m.id === id),
        row.metrics[id],
      )
    lines.push(
      `| ${row.page} | ${row.formFactor} | ${score('performance')} | ${score('accessibility')} | ${score('best-practices')} | ${score('seo')} | ${metric('largest-contentful-paint')} | ${metric('cumulative-layout-shift')} | ${metric('total-blocking-time')} | [HTML](reports/${row.report}.html) · [JSON](reports/${row.report}.json) |`,
    )
  }
  const env = summary.environment
  lines.push(
    '',
    '## Execuções individuais',
    '',
    '| Página | Dispositivo | Execução | Perf. | A11y | BP | SEO | LCP | CLS | TBT |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  )
  for (const row of summary.results) {
    row.runs.forEach((run, i) => {
      const metric = (id) =>
        fmtMetric(
          METRICS.find((m) => m.id === id),
          run.metrics[id],
        )
      lines.push(
        `| ${row.page} | ${row.formFactor} | ${i + 1} | ${CATEGORIES.map((id) => run.scores[id]).join(' | ')} | ${metric('largest-contentful-paint')} | ${metric('cumulative-layout-shift')} | ${metric('total-blocking-time')} |`,
      )
    })
  }
  lines.push(
    '',
    '## Ambiente',
    '',
    `- Alvo: ${env.target}`,
    `- Lighthouse ${env.lighthouse} · ${env.browser}`,
    `- Node ${env.node} · ${env.os}`,
    `- CPU: ${env.cpu} (${env.cores} núcleos) · RAM: ${env.memoryGb} GB · benchmarkIndex mediano: ${env.benchmarkIndex}`,
    '- Mobile: configuração padrão do Lighthouse (Moto G Power emulado, 4× CPU, rede 4G lenta simulada).',
    '- Desktop: `desktop-config` do Lighthouse (1350×940, rede e CPU de desktop simuladas).',
    '- Cada execução abre um Chrome com perfil limpo: o service worker do MSW é registrado do zero, como numa primeira visita.',
    '- Com os mocks ligados (como no deploy), a API simulada responde com a latência do cenário padrão (120–450 ms).',
    '',
    '## Por que um servidor próprio',
    '',
    'O `vite preview` serve em HTTP/1.1 e sem compressão. Nesse cenário o Lighthouse simula no máximo 6 conexões',
    'por origem, e cada chunk do code splitting paga round-trips de 150 ms que não existem na Vercel, que serve em',
    'HTTP/2 com brotli. O script sobe um servidor que reproduz o deploy: HTTP/2 (TLS autoassinado), arquivos',
    'pré-comprimidos, os mesmos cabeçalhos de cache do `vercel.json` e fallback SPA. Para auditar o deploy real:',
    '`node scripts/lighthouse.mjs --url https://<deploy>`.',
    '',
  )
  return lines.join('\n')
}

async function main() {
  let server
  let base = args.url
  if (!base) {
    if (!existsSync(path.join(DIST, 'index.html'))) {
      throw new Error(
        'dist/ não existe: rode `pnpm build` antes (o script `pnpm lighthouse` já faz isso).',
      )
    }
    server = await serveDist()
    base = `https://localhost:${server.address().port}`
  }

  rmSync(path.join(OUT, 'reports'), { recursive: true, force: true })
  mkdirSync(path.join(OUT, 'reports'), { recursive: true })

  const rows = []
  const benchmarks = []
  let sample
  try {
    for (const page of PAGES) {
      for (const formFactor of FORM_FACTORS) {
        const results = []
        for (let i = 1; i <= RUNS; i++) {
          process.stdout.write(`${page.name} · ${formFactor.name} · execução ${i}/${RUNS}… `)
          const result = await audit(base + page.path, formFactor)
          results.push(result)
          benchmarks.push(result.lhr.environment.benchmarkIndex)
          sample ??= result.lhr
          const s = result.lhr.categories
          console.log(CATEGORIES.map((id) => Math.round(s[id].score * 100)).join(' / '))
        }
        const { medianRun, ...summary } = summarize(results)
        const report = `${page.id}-${formFactor.id}`
        const [html, json] = medianRun.report
        writeFileSync(path.join(OUT, 'reports', `${report}.html`), html)
        writeFileSync(path.join(OUT, 'reports', `${report}.json`), json)
        rows.push({
          page: page.name,
          path: page.path,
          formFactor: formFactor.name,
          report,
          ...summary,
        })
      }
    }
  } finally {
    server?.close()
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    runs: RUNS,
    targets: TARGETS,
    environment: {
      target:
        args.url ??
        'build de produção local (HTTP/2 com TLS, brotli, cache imutável e fallback SPA)',
      lighthouse: sample.lighthouseVersion,
      browser:
        sample.environment.hostUserAgent.match(/(HeadlessChrome|Chrome)\/[\d.]+/)?.[0] ?? 'Chrome',
      node: process.version,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      cpu: os.cpus()[0]?.model.trim(),
      cores: os.cpus().length,
      memoryGb: Math.round(os.totalmem() / 1024 ** 3),
      benchmarkIndex: Math.round(median(benchmarks)),
    },
    results: rows,
  }
  writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
  writeFileSync(path.join(OUT, 'README.md'), markdown(summary))

  console.log('')
  console.table(
    rows.map((r) => ({
      página: r.page,
      dispositivo: r.formFactor,
      ...r.scores,
      LCP: fmtMetric(METRICS[0], r.metrics['largest-contentful-paint']),
      CLS: fmtMetric(METRICS[1], r.metrics['cumulative-layout-shift']),
      TBT: fmtMetric(METRICS[2], r.metrics['total-blocking-time']),
    })),
  )
  const failures = rows.flatMap((r) =>
    CATEGORIES.filter((id) => r.scores[id] < TARGETS[id]).map(
      (id) => `${r.page} · ${r.formFactor}: ${id} ${r.scores[id]} < ${TARGETS[id]}`,
    ),
  )
  if (failures.length) {
    console.error(`\nAbaixo da meta:\n- ${failures.join('\n- ')}`)
    process.exitCode = 1
  } else {
    console.log('\nTodas as medianas atingiram as metas.')
  }
}

await main()
