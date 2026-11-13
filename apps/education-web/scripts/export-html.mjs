import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const modelPath = 'assets/models/motorglb/ev-ipmsm-motor.glb'
const model = await readFile(resolve(root, 'public', modelPath))
if (model.toString('ascii', 0, 4) !== 'glTF' || model.readUInt32LE(8) !== model.length) {
  throw new Error('Demo model is not a complete GLB file.')
}
const modelUrl = `data:model/gltf-binary;base64,${model.toString('base64')}`
let embeddedModel = false
let embeddedLoaders = 0

// Transform only the export bundle; leave development sources and the GLB untouched.
const result = await build({
  root,
  configFile: false,
  envDir: false,
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [
    {
      name: 'standalone-motor-asset',
      enforce: 'pre',
      transform(code, id) {
        const file = id.replaceAll('\\', '/').split('?')[0]
        if (file.endsWith('/motor-glb/motor-view-config.ts')) {
          if (!code.includes(`'${modelPath}'`)) throw new Error('Motor asset path changed; update the HTML exporter.')
          embeddedModel = true
          return code.replace(`'${modelPath}'`, JSON.stringify(modelUrl))
        }
        if (file.endsWith('/motor-glb/MotorModel.tsx') || file.endsWith('/motor-glb/MotorGlbPreview.tsx')) {
          const prefix = 'import.meta.env.BASE_URL + MOTOR_MODEL_PATH'
          if (!code.includes(prefix)) throw new Error('Motor loader changed; update the HTML exporter.')
          embeddedLoaders++
          return code.replaceAll(prefix, 'MOTOR_MODEL_PATH')
        }
      },
    },
    react(),
    tailwindcss(),
  ],
  build: {
    write: false,
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    lib: { entry: resolve(root, 'src/demo-main.tsx'), name: 'APITechDemo', formats: ['iife'] },
    rolldownOptions: { output: { codeSplitting: false } },
  },
})
const bundle = Array.isArray(result) && result.length === 1 ? result[0] : result
if (!bundle || !('output' in bundle)) throw new Error('Unexpected export build output.')
if (!embeddedModel || embeddedLoaders !== 2) throw new Error('Motor asset was not fully embedded.')
const chunks = bundle.output.filter((item) => item.type === 'chunk')
const styles = bundle.output.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'))
const otherAssets = bundle.output.filter((item) => item.type === 'asset' && !item.fileName.endsWith('.css'))
if (chunks.length !== 1 || otherAssets.length) throw new Error('Export contains external files; refusing incomplete HTML.')
// Rolldown can retain self-references in metadata after folding lazy imports into IIFE.
const externalImports = [...chunks[0].imports, ...chunks[0].dynamicImports].filter((name) => name !== chunks[0].fileName)
if (externalImports.length || /\bimport\s*\(/.test(chunks[0].code)) throw new Error(`Export still requires external JavaScript: ${externalImports.join(', ')}`)
const css = styles.map((item) => String(item.source)).join('\n').replace(/<\/style/gi, '<\\/style')
const js = chunks[0].code.replace(/<\/script/gi, '<\\/script')
let html = await readFile(resolve(root, 'index.html'), 'utf8')
html = html
  .replace(/<link\b[^>]*rel="icon"[^>]*>/i, '')
  .replace(/<script\b[^>]*src="\/src\/main\.tsx"[^>]*><\/script>/i, () => `<script>${js}</script>`)
  .replace('</head>', () => `<style>${css}</style>\n</head>`)
if (/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\bhref\s*=/i.test(html)) throw new Error('HTML still references an external script or stylesheet.')
const outputDir = resolve(root, 'dist/standalone')
await mkdir(outputDir, { recursive: true })
const outputFile = resolve(outputDir, 'APITech-CAN-Education.html')
await writeFile(outputFile, html, 'utf8')
console.log(`Standalone HTML: ${outputFile}`)
console.log(`Size: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB (GLB embedded, no companion files)`)
