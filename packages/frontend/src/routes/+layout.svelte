<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { loadVideos } from '$lib/stores/videos.store';
  import { page } from '$app/stores';
  import { theme } from '$lib/stores/theme.store';
  import { currentLocale, _, initI18n } from '$lib/i18n';
  import { browser } from '$app/environment';
  import ServiceStatusPanel from '$lib/components/ServiceStatusPanel.svelte';
  import { contextMenuStore } from '$lib/stores/context-menu.store';
  import GlobalContextMenu from '$lib/components/GlobalContextMenu.svelte';
  
      // Material Design Icons
      import LightModeIcon from '@material-icons/svg/svg/light_mode/baseline.svg?raw';
      import DarkModeIcon from '@material-icons/svg/svg/dark_mode/baseline.svg?raw';
  
  // Load videos on mount only if not on a video detail page
  onMount(() => {
    if (!$page.params.id) {
      loadVideos();
    }
    
    // Initialize theme and locale
    theme.init();
    initI18n();
  });
  
  function toggleLanguage() {
    if (browser) {
      const currentLocaleValue = $currentLocale;
      const newLocale = currentLocaleValue === 'en' ? 'de' : 'en';
      currentLocale.set(newLocale);
      localStorage.setItem('prismvid-locale', newLocale);
    }
  }
</script>

<div class="min-h-screen">
  <!-- Header -->
  <header class="mt-4 mb-6">
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-24">
        <div class="flex items-center">
          <a href="/" class="flex items-center gap-3">
            <!-- <img src="/logo.png" alt="PrismVid Logo" class="h-40 w-40" /> -->
            <span
              class="font-semibold text-gray-900 dark:text-white"
              style="letter-spacing: -0.15em; font-size: 4.25rem;"
            >
              BOTOX
            </span>
          </a>
        </div>
        
        <div class="glass-card flex items-center space-x-4 px-4 py-2 rounded-full">
          <!-- Navigation -->
          <nav class="hidden md:flex space-x-8 font-light">
            <a 
              href="/videos" 
              class="text-xs text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors {$page.url.pathname === '/videos' ? 'text-gray-900 dark:text-white' : ''}"
            >
{$currentLocale === 'en' ? 'Videos' : 'Videos'}
            </a>
            <a 
              href="/search" 
              class="text-xs text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors {$page.url.pathname === '/search' ? 'text-gray-900 dark:text-white' : ''}"
            >
{$currentLocale === 'en' ? 'Search' : 'Suche'}
            </a>
            <a 
              href="/ai-creator" 
              class="text-xs text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors {$page.url.pathname.startsWith('/ai-creator') ? 'text-gray-900 dark:text-white' : ''}"
            >
{$currentLocale === 'en' ? 'AI Creator' : 'KI Creator'}
            </a>
            <a 
              href="/projects" 
              class="text-xs text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors {$page.url.pathname.startsWith('/projects') ? 'text-gray-900 dark:text-white' : ''}"
            >
{$currentLocale === 'en' ? 'Projects' : 'Projekte'}
            </a>
            <a 
              href="/upload" 
              class="text-xs text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors {$page.url.pathname === '/upload' ? 'text-gray-900 dark:text-white' : ''}"
            >
{$currentLocale === 'en' ? 'Upload' : 'Hochladen'}
            </a>
          </nav>
          
              <!-- Language Switch -->
              <div class="flex items-center gap-3">
                <button
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {$currentLocale === 'en' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}"
                  on:click={toggleLanguage}
                  title="Toggle Language / Sprache umschalten"
                  role="switch"
                  aria-checked={$currentLocale === 'en'}
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {$currentLocale === 'en' ? 'translate-x-6' : 'translate-x-1'}"
                  ></span>
                </button>
                <span class="text-xs font-light text-gray-600 dark:text-white/70">DE | EN</span>
              </div>
          
          <!-- Theme Toggle -->
          <button
            class="glass-button p-2"
            on:click={() => theme.toggle()}
            title="Toggle Theme / Theme umschalten"
          >
            <div class="w-5 h-5">{@html $theme === 'light' ? DarkModeIcon : LightModeIcon}</div>
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="w-full px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>

  <!-- Footer -->
  <footer class="glass-effect border-t border-black/10 dark:border-white/10 mt-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="text-center text-gray-600 dark:text-white/60 text-xs">
            <p>© 2024 PrismVid - {$currentLocale === 'en' ? 'Video Analysis Dashboard' : 'Video-Analyse Dashboard'}</p>
          </div>
    </div>
  </footer>
  
  <!-- Service Status Panel -->
  <ServiceStatusPanel />
  
  <!-- Global Context Menu -->
  <GlobalContextMenu />
</div>
