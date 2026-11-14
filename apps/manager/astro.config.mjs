import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  base: '/manager',
  integrations: [vue()],
  output: 'static',
});
