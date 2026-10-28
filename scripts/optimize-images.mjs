// Gera variantes AVIF/WebP responsivas a partir dos originais exportados do Figma.
// Uso: pnpm images
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'design/originals'
const OUT = 'public/images/nfts'
const WIDTHS = [160, 320, 640, 960]

await mkdir(OUT, { recursive: true })
const files = (await readdir(SRC)).filter((f) => f.endsWith('.png'))

for (const file of files) {
  const name = path.basename(file, '.png')
  for (const width of WIDTHS) {
    const base = sharp(path.join(SRC, file)).resize(width, width)
    await base
      .clone()
      .avif({ quality: 55 })
      .toFile(path.join(OUT, `${name}-${width}.avif`))
    await base
      .clone()
      .webp({ quality: 78 })
      .toFile(path.join(OUT, `${name}-${width}.webp`))
  }
  console.log(`✓ ${name}`)
}
