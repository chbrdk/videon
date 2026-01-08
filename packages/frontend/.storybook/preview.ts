import type { Preview } from '@storybook/sveltekit';
import '../src/app.css';

// Ensure React runs in development mode
if (typeof window !== 'undefined') {
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
  (window as any).process = (window as any).process || { env: { NODE_ENV: 'development' } };
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        dark: {
          name: 'dark',
          value: '#0f172a'
        },

        light: {
          name: 'light',
          value: '#f8fafc'
        }
      }
    },
    docs: {
      toc: true
    },
    layout: 'centered'
  },

  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true
      }
    }
  },

  decorators: [
    (story, context) => {
      const theme = context.globals.theme || 'dark';
      return {
        Component: story,
        props: {
          ...story.props,
          class: `theme-${theme}`
        }
      };
    }
  ],

  initialGlobals: {
    backgrounds: {
      value: 'dark'
    }
  }
};

export default preview;