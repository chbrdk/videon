import path from 'path';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Load .env from monorepo root (for VITE_DEV_BYPASS_AUTH etc.)
  envDir: path.resolve(__dirname, '../..'),
  base: process.env.VITE_BASE_PATH === '/' ? '' : (process.env.VITE_BASE_PATH || '/videon'),
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
    base: process.env.VITE_BASE_PATH === '/' ? '' : (process.env.VITE_BASE_PATH || '/videon')
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts']
  },
  build: {
    sourcemap: true,
    // Debug: set VITE_DEBUG_BUILD=1 to disable minify and see actual property names in errors
    ...(process.env.VITE_DEBUG_BUILD === '1' ? { minify: false } : {})
  },
  optimizeDeps: {
    exclude: ['@sveltejs/kit']
  }
});
