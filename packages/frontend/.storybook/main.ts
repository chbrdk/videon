import type { StorybookConfig } from '@storybook/sveltekit';
import { mergeConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

// ES Modules don't have __dirname, so we need to create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
  stories: [
    '../src/stories/**/*.stories.@(js|ts|svelte)',
    '../src/lib/components/**/*.stories.@(js|ts|svelte)'
  ],

  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-svelte-csf',
    '@storybook/addon-docs'
  ],

  framework: {
    name: '@storybook/sveltekit',
    options: {}
  },

  core: {
    disableTelemetry: true
  },

  managerHead: (head, { configType }) => {
    if (configType === 'DEVELOPMENT') {
      return `
        ${head}
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script>
          // Ensure Storybook works from any hostname
          window.STORYBOOK_HOST = '192.168.50.101';
          window.STORYBOOK_PORT = 6006;
          
          // Force React to development mode - MUST be before React loads
          if (typeof process === 'undefined') {
            window.process = { env: { NODE_ENV: 'development' } };
          } else if (!process.env) {
            process.env = { NODE_ENV: 'development' };
          } else {
            process.env.NODE_ENV = 'development';
          }
          if (typeof __DEV__ === 'undefined') {
            window.__DEV__ = true;
          }
        </script>
      `;
    }
    return head;
  },

  viteFinal: async (config) => {
    const tailwindcss = await import('tailwindcss');
    const autoprefixer = await import('autoprefixer');
    
    // Set mode to development for Storybook
    config.mode = config.mode || 'development';
    
    // Ensure we merge server config properly
    const serverConfig = config.server || {};
    
    // Define plugins inline to avoid scope issues
    const plugins: Plugin[] = [
      // Fix for missing @storybook/core internal exports
      {
        name: 'fix-storybook-imports',
        enforce: 'pre',
        resolveId(id, importer) {
          // Skip if id contains null bytes (virtual modules) - let Vite handle them natively
          if (!id || id.includes('\x00')) {
            return null;
          }
          
          // Fix storybook/* imports to @storybook/core/*
          if (id.startsWith('storybook/') && !id.startsWith('storybook/node_modules')) {
            const internalPath = id.replace('storybook/', '@storybook/core/');
            return internalPath;
          }
          // Fix @storybook/core/internal/* to actual paths
          if (id.startsWith('@storybook/core/internal/')) {
            const internalName = id.replace('@storybook/core/internal/', '');
            return `@storybook/core/dist/internal/${internalName}/index.js`;
          }
          return null;
        }
      },
      // Separate plugin to handle virtual module file access - prevents null byte errors
      {
        name: 'virtual-module-fix',
        enforce: 'pre',
        load(id) {
          // Prevent Vite from trying to read virtual modules as files
          if (id && (id.includes('\x00') || (id.includes('virtual:') && id.includes('/@id/')))) {
            // Return empty module to prevent file system access
            // Storybook's own plugins will handle the actual virtual module resolution
            return 'export {}';
          }
          return null;
        }
      },
      // Force React to use development mode
      {
        name: 'react-development-mode',
        enforce: 'pre',
        transform(code, id) {
          // Process all files that might contain React production checks
          if (id && (
            id.includes('/react/') || 
            id.includes('/react-dom/') || 
            id.includes('hook.js') ||
            id.includes('@storybook/react-dom-shim') ||
            id.includes('@mdx-js/react')
          )) {
            // Replace production mode checks with development
            let transformed = code;
            
            // Replace various production mode checks
            transformed = transformed.replace(/process\.env\.NODE_ENV\s*===\s*['"]production['"]/g, 'false');
            transformed = transformed.replace(/process\.env\.NODE_ENV\s*!==\s*['"]production['"]/g, 'true');
            transformed = transformed.replace(/process\.env\.NODE_ENV\s*===\s*['"]development['"]/g, 'true');
            transformed = transformed.replace(/process\.env\.NODE_ENV/g, '"development"');
            transformed = transformed.replace(/__DEV__/g, 'true');
            transformed = transformed.replace(/__PROD__/g, 'false');
            
            // Specific fix for React hook.js error
            transformed = transformed.replace(/dead code elimination has not been applied/g, 'development mode');
            transformed = transformed.replace(/running in production mode/g, 'running in development mode');
            
            return transformed !== code ? { code: transformed, map: null } : null;
          }
          return null;
        },
        transformIndexHtml(html) {
          // Inject script to override React dev mode check
          return html.replace(
            '</head>',
            `<script>
              if (typeof process === 'undefined') {
                window.process = { env: { NODE_ENV: 'development' } };
              } else if (!process.env) {
                process.env = { NODE_ENV: 'development' };
              } else {
                process.env.NODE_ENV = 'development';
              }
            </script></head>`
          );
        }
      }
    ];
    
    return mergeConfig(config, {
      plugins: [
        ...(config.plugins || []),
        ...plugins
      ],
      resolve: {
        ...config.resolve,
        alias: {
          ...(typeof config.resolve?.alias === 'object' && !Array.isArray(config.resolve.alias) ? config.resolve.alias : {}),
          $lib: path.resolve(__dirname, '../src/lib')
        },
        conditions: ['import', 'module', 'browser', 'default'],
        // Prefer development builds
        mainFields: ['browser', 'module', 'main']
      },
      css: {
        postcss: {
          plugins: [
            tailwindcss.default,
            autoprefixer.default
          ]
        }
      },
      define: {
        // Prevent SvelteKit-specific imports from breaking Storybook
        'import.meta.env.KIT_ROUTING': 'false',
        // Ensure React runs in development mode for Storybook
        'process.env.NODE_ENV': '"development"',
        '__DEV__': 'true'
      },
      optimizeDeps: {
        include: ['@storybook/sveltekit'],
        exclude: ['storybook/test', '@vitest/mocker', '@vitest/mocker-browser'],
        esbuildOptions: {
          // Ensure React is not minified in development
          minify: false,
          define: {
            'process.env.NODE_ENV': '"development"'
          },
          // Force React to use development build
          loader: {
            '.js': 'jsx'
          }
        }
      },
      ssr: {
        noExternal: ['@storybook/sveltekit']
      },
      server: {
        ...serverConfig,
        host: '0.0.0.0',
        port: 6006,
        strictPort: false,
        hmr: {
          ...serverConfig.hmr,
          protocol: 'ws',
          host: '192.168.50.101',
          port: 6006,
          clientPort: 6006
        },
        // Allow all hosts in development - this is critical for remote access
        allowedHosts: 'all',
        cors: true,
        // Ensure proper origin handling
        origin: `http://192.168.50.101:6006`,
        fs: {
          ...serverConfig.fs,
          // Allow serving files from outside the project root
          strict: false
        }
      },
    });
  },

  typescript: {
    check: false,
    checkOptions: {},
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  }
};
export default config;