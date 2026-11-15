import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  base: '/manager',
  integrations: [vue()],
  output: 'static',
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3002',
          changeOrigin: true,
        },
      },
    },
  },
});
