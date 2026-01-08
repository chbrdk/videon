import type { Plugin } from 'vite';

/**
 * Vite plugin to fix the missing @storybook/core/internal/preview/runtime export
 * This is a workaround for Storybook 8.6.14 compatibility issue
 */
export function fixStorybookRuntime(): Plugin {
  return {
    name: 'fix-storybook-runtime',
    enforce: 'pre',
    resolveId(id) {
      if (id === '@storybook/core/internal/preview/runtime') {
        // Redirect to the actual location
        return {
          id: '@storybook/core/dist/preview/runtime.js',
          external: false
        };
      }
      return null;
    }
  };
}

