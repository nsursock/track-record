import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '_site',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'lodash',
        'dropzone',
        'flatpickr'
      ]
    }
  },
  server: {
    port: 8080
  },
  root: './src',
  publicDir: './src/assets',
  base: '/',
  css: {
    devSourcemap: true
  },
  optimizeDeps: {
    include: ['lodash', 'dropzone', 'flatpickr']
  }
}); 