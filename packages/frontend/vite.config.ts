import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 3000,
    host: true,
    fs: {
      allow: ['..', '../..', '../../..', '/Volumes/DOCKER_EXTERN/prismvid']
    }
  },
  preview: {
    port: 3000,
    host: true
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts']
  }
});
