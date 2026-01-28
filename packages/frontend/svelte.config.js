import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: false
    }),
    paths: {
      base: process.env.VITE_BASE_PATH === '/' ? '' : (process.env.VITE_BASE_PATH || '/videon')
      // assets wird automatisch aus base abgeleitet - nicht explizit setzen!
    },
    prerender: {
      entries: ['*']
    }
  }
};

export default config;
