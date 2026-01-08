import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

const defaultTheme: Theme = 'dark';

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>(defaultTheme);

  return {
    subscribe,
    set: (theme: Theme) => {
      set(theme);
      if (browser) {
        localStorage.setItem('prismvid-theme', theme);
        document.documentElement.className = theme;
      }
    },
    toggle: () => {
      update(currentTheme => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        if (browser) {
          localStorage.setItem('prismvid-theme', newTheme);
          document.documentElement.className = newTheme;
        }
        return newTheme;
      });
    },
    init: () => {
      if (browser) {
        const savedTheme = localStorage.getItem('prismvid-theme') as Theme;
        const theme = savedTheme || defaultTheme;
        set(theme);
        document.documentElement.className = theme;
      }
    }
  };
}

export const theme = createThemeStore();
