import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Shared workspace packages contain source TSX; keep them in Vite's source pipeline.
  optimizeDeps: { exclude: ['@apitech/brand', '@apitech/content-ui'] },
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
})
