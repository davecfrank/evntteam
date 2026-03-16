import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// Brand colors
const BG = '#0A0A0A'
const ACCENT = '#FF4D00'

// Generate an SVG with the "E" logo
function makeSvg(size, maskable = false) {
  const padding = maskable ? Math.round(size * 0.2) : Math.round(size * 0.1)
  const innerSize = size - padding * 2
  const fontSize = Math.round(innerSize * 0.6)
  const cx = size / 2
  const cy = size / 2

  // For maskable: fill entire canvas with bg, for regular: rounded rect
  const background = maskable
    ? `<rect width="${size}" height="${size}" fill="${BG}"/>`
    : `<rect x="${padding * 0.3}" y="${padding * 0.3}" width="${size - padding * 0.6}" height="${size - padding * 0.6}" rx="${Math.round(size * 0.18)}" fill="${BG}"/>`

  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  ${background}
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${fontSize}"
    fill="${ACCENT}" letter-spacing="-2">E</text>
</svg>`)
}

const icons = [
  // Standard PWA icons
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  // Maskable (full bleed, 20% safe zone)
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
  // Apple touch icons
  { name: 'apple-touch-icon-120x120.png', size: 120 },
  { name: 'apple-touch-icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon-167x167.png', size: 167 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
]

for (const icon of icons) {
  const svg = makeSvg(icon.size, icon.maskable)
  await sharp(svg).png().toFile(join(outDir, icon.name))
  console.log(`✓ ${icon.name} (${icon.size}x${icon.size}${icon.maskable ? ' maskable' : ''})`)
}

console.log('\nAll icons generated in public/icons/')
