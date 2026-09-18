/**
 * Renders the tally-mark app icon to the PNG sizes the manifest and iOS need.
 * Run with `npm run icons` after editing the mark below.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = '#1B4D3E'

/**
 * The mark itself, always drawn in the design's 180x180 box, so `radius` is in
 * viewBox units and stays proportional at every output size. 0 = full bleed.
 */
const mark = (radius) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" rx="${radius}" fill="${BG}"/>
  <g stroke="#F6F4EF" stroke-width="11" stroke-linecap="round">
    <path d="M52 56 L52 124"/>
    <path d="M75 56 L75 124"/>
    <path d="M98 56 L98 124"/>
    <path d="M121 56 L121 124"/>
    <path d="M42 126 L131 54" stroke="#E0B341"/>
  </g>
</svg>`

/**
 * Maskable icons get cropped to whatever shape the launcher wants, so the art
 * is inset to the 80% safe zone inside a full-bleed background.
 */
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" fill="${BG}"/>
  <g transform="translate(90 90) scale(0.8) translate(-90 -90)"
     stroke="#F6F4EF" stroke-width="11" stroke-linecap="round">
    <path d="M52 56 L52 124"/>
    <path d="M75 56 L75 124"/>
    <path d="M98 56 L98 124"/>
    <path d="M121 56 L121 124"/>
    <path d="M42 126 L131 54" stroke="#E0B341"/>
  </g>
</svg>`

const targets = [
  { file: 'icon-192.png', size: 192, svg: mark(40) },
  { file: 'icon-512.png', size: 512, svg: mark(40) },
  { file: 'icon-maskable-512.png', size: 512, svg: maskable },
  // iOS applies its own mask, so the source must be a square with no corners.
  { file: 'apple-touch-icon.png', size: 180, svg: mark(0) },
]

await mkdir(OUT_DIR, { recursive: true })

for (const { file, size, svg } of targets) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  await writeFile(resolve(OUT_DIR, file), png)
  console.log(`wrote public/${file} (${size}x${size})`)
}
