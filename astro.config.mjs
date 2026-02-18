import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import astroIcon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.ashtonhawkins.com',
  output: 'static',
  prefetch: true,
  integrations: [sitemap(), astroIcon()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
        '@data': '/src/data',
        '@content': '/src/content',
        '@styles': '/src/styles'
      }
    }
  }
});
