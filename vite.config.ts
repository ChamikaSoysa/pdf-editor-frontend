import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
   optimizeDeps: {
    exclude: ['pdfjs-dist'] // Prevent double-processing
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://localhost:7200',
        secure: false,
      },
    },
  },
});