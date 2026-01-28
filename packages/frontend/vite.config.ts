import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  base: process.env.VITE_BASE_PATH || '/videon',
  server: {
    port: 3010,
    host: true,
    allowedHosts: ['host.docker.internal', '192.168.50.101', 'localhost'],
    fs: {
      allow: ['..', '../..', '../../..', '/Volumes/DOCKER_EXTERN/prismvid']
    }
  },
  preview: {
    port: 3010,
    host: true,
    base: process.env.VITE_BASE_PATH || '/videon'
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts']
  }
});
