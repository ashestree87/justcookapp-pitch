// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'static',
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['chart.js', 'react-chartjs-2']
          }
        }
      }
    }
  }
});
