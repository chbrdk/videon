<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { theme } from '$lib/stores/theme.store';
  import {
    MSQDX_COLORS,
    MSQDX_SPACING,
    MSQDX_RESPONSIVE,
    MSQDX_TYPOGRAPHY,
  } from '$lib/design-tokens';
  import { base } from '$app/paths';
  import MsqdxAdminNav from './MsqdxAdminNav.svelte';

  let { title, subtitle }: { title?: string; subtitle?: string } = $props();

  let drawerOpen = $state(false);
  let mounted = $state(false);
  let isMobile = $state(false);

  onMount(() => {
    mounted = true;
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });

  function checkMobile() {
    if (typeof window !== 'undefined') {
      isMobile = window.innerWidth < 900; // md breakpoint
    }
  }

  function handleDrawerToggle() {
    drawerOpen = !drawerOpen;
  }

  function handleDrawerClose() {
    drawerOpen = false;
  }

  function getPageTitle() {
    const pathname = $page.url.pathname;
    const pathMap: Record<string, string> = {
      '/videos': 'Videos',
      '/search': 'Suche',
      '/ai-creator': 'KI Creator',
      '/projects': 'Projekte',
      '/upload': 'Hochladen',
      '/settings': 'Settings',
    };

    if (pathMap[pathname]) {
      return pathMap[pathname];
    }

    for (const [path, label] of Object.entries(pathMap)) {
      if (pathname?.startsWith(path) && path !== '/videos') {
        return label;
      }
    }

    return '';
  }

  function getPageIcon() {
    const pathname = $page.url.pathname;
    const iconMap: Record<string, string> = {
      '/videos': 'video_file',
      '/search': 'search',
      '/ai-creator': 'auto_awesome',
      '/projects': 'folder',
      '/upload': 'upload_file',
      '/settings': 'settings',
    };

    if (iconMap[pathname]) {
      return iconMap[pathname];
    }

    const sortedPaths = Object.keys(iconMap).sort((a, b) => b.length - a.length);
    for (const path of sortedPaths) {
      if (pathname?.startsWith(path) && path !== '/videos') {
        return iconMap[path];
      }
    }

    return 'toc';
  }

  let currentTheme = $derived($theme);
  let pageTitle = $derived(getPageTitle());
  let pageIcon = $derived(getPageIcon());
</script>

<div
  class="msqdx-admin-layout"
  style="
    display: flex;
    min-height: 100vh;
    position: relative;
    width: 100%;
    max-width: 100vw;
    overflow-x: visible;
    padding-top: 0;
    padding-right: 0;
    padding-bottom: 0;
    padding-left: 0;
    box-sizing: border-box;
    background-color: var(--msqdx-color-brand-orange);
    height: {isMobile
    ? `calc(100vh - ${MSQDX_SPACING.scale.xxs * 2}px)`
    : `calc(100vh - ${MSQDX_SPACING.scale.xs * 2}px)`};
    overflow: hidden;
  "
>
  <!-- Sidebar -->
  <MsqdxAdminNav open={drawerOpen} onClose={handleDrawerClose} />

  <!-- Container: Header + Main -->
  <div
    class="msqdx-glass-admin-container"
    style="
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      min-height: 100vh;
      position: relative;
      border: {isMobile
      ? `${MSQDX_RESPONSIVE.outerShell.border.xs}px solid var(--msqdx-color-brand-orange)`
      : `${MSQDX_RESPONSIVE.outerShell.border.md}px solid var(--msqdx-color-brand-orange)`};
      border-top: {isMobile
      ? `${MSQDX_RESPONSIVE.outerShell.border.xs}px solid var(--msqdx-color-brand-orange)`
      : `${MSQDX_RESPONSIVE.outerShell.border.md}px solid var(--msqdx-color-brand-orange)`};
      border-right: {isMobile
      ? `${MSQDX_RESPONSIVE.outerShell.border.xs}px solid var(--msqdx-color-brand-orange)`
      : `${MSQDX_RESPONSIVE.outerShell.border.md}px solid var(--msqdx-color-brand-orange)`};
      border-bottom: {isMobile
      ? `${MSQDX_RESPONSIVE.outerShell.border.xs}px solid var(--msqdx-color-brand-orange)`
      : `${MSQDX_RESPONSIVE.outerShell.border.md}px solid var(--msqdx-color-brand-orange)`};
      border-left: {isMobile
      ? `${MSQDX_RESPONSIVE.outerShell.border.xs}px solid var(--msqdx-color-brand-orange)`
      : '0'};
      border-radius: {MSQDX_RESPONSIVE.outerShell.radius}px;
      background-color: {currentTheme === 'dark'
      ? MSQDX_COLORS.dark.background
      : MSQDX_COLORS.light.background};
      background-image: {currentTheme === 'dark'
      ? 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)'
      : 'linear-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px)'};
      background-size: 20px 20px;
      background-attachment: fixed;
      overflow-x: visible;
      overflow-y: hidden;
      transition: border-color 0.3s ease, background-color 0.3s ease;
    "
  >
    <!-- Header Bar -->
    <header
      class="msqdx-glass-admin-header-bar"
      style="
        position: sticky;
        top: 0;
        z-index: 1100;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: {isMobile ? '0.75rem 1rem' : '1rem 1.5rem'};
        min-height: {isMobile ? '56px' : '64px'};
        background-color: transparent;
        overflow: visible;
        border-bottom: 0;
        border-top-left-radius: 40px;
        border-top-right-radius: 40px;
      "
    >
      <!-- L-shaped corner element -->
      <div
        class="msqdx-glass-admin-header-corner"
        style="
          position: absolute;
          top: -2px;
          left: {isMobile ? '-203px' : '-3px'};
          width: 363px;
          height: 135px;
          z-index: -1;
          pointer-events: none;
          overflow: visible;
        "
      >
        <svg
          width="363"
          height="135"
          viewBox="0 0 363 135"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style="width: 100%; height: 100%;"
        >
          <path
            d="M3 120V134.5H0V0H362.5V2H328.5C306.961 2 289.5 19.4609 289.5 41C289.5 62.5391 272.039 80 250.5 80H43C20.9086 80 3 97.9086 3 120Z"
            fill="var(--msqdx-color-brand-orange)"
            style="transition: fill 0.3s ease;"
          />
        </svg>
      </div>

      <!-- Logo -->
      <div
        style="
          position: absolute;
          top: 22px;
          left: {isMobile ? 'auto' : '-40px'};
          right: {isMobile ? '22px' : 'auto'};
          z-index: 1200;
          display: flex;
          align-items: center;
          gap: {isMobile ? '0.5rem' : '14px'};
          background-color: var(--msqdx-color-brand-orange);
          padding: {isMobile ? '0.5rem' : '0.25rem 1rem'};
          border-radius: {isMobile
          ? `${MSQDX_SPACING.borderRadius.sm}px`
          : `${MSQDX_SPACING.borderRadius.md}px`};
          height: fit-content;
        "
      >
        <div
          style="
            display: flex;
            align-items: center;
            padding-left: 1px;
            padding-right: 1px;
            padding-top: 0;
            padding-bottom: 0;
            height: fit-content;
          "
        >
          <img
            src="{base}/videon/assets/msqdx-logo.svg"
            alt="MSQDX logo"
            width="120"
            height="30"
            style="
              height: auto;
              width: auto;
              max-width: 140px;
              filter: none;
              display: block;
            "
          />
        </div>

        <div
          style="
            height: 24px;
            border-left: 1px solid {currentTheme === 'dark'
            ? MSQDX_COLORS.brand.black
            : MSQDX_COLORS.light.textPrimary};
            display: {isMobile ? 'none' : 'block'};
          "
        />

        <span
          style="
            letter-spacing: -1.5px;
            text-transform: uppercase;
            font-size: {MSQDX_TYPOGRAPHY.fontSize['3xl']};
            line-height: 0.9;
            color: {currentTheme === 'dark' ? MSQDX_COLORS.brand.black : 'inherit'};
            display: {isMobile ? 'none' : 'block'};
            margin: 0;
            padding: 0;
            align-self: center;
            font-weight: 100;
          "
        >
          VIDEON
        </span>
      </div>

      <!-- Page Title -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          width: 100%;
        "
      >
        {#if pageTitle}
          <h1
            style="
              font-size: {MSQDX_TYPOGRAPHY.fontSize['4xl']};
              text-transform: lowercase;
              margin-top: -15px;
              letter-spacing: -2px;
              color: {currentTheme === 'dark'
              ? MSQDX_COLORS.dark.textPrimary
              : MSQDX_COLORS.light.textPrimary};
              display: {isMobile ? 'none' : 'block'};
              font-weight: 800;
              margin: 0;
            "
          >
            {pageTitle}
          </h1>
        {/if}
      </div>

      <!-- Hamburger button -->
      {#if isMobile}
        <button
          on:click={handleDrawerToggle}
          aria-label="Toggle navigation"
          style="
            position: absolute;
            left: 1rem;
            top: 7px;
            z-index: 1201;
            color: {currentTheme === 'dark'
            ? MSQDX_COLORS.brand.black
            : MSQDX_COLORS.light.textPrimary};
            padding: 16px;
            display: {drawerOpen ? 'none' : 'flex'};
            width: 64px;
            height: 64px;
            background: transparent;
            border: none;
            cursor: pointer;
            align-items: center;
            justify-content: center;
          "
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
          </svg>
        </button>
      {/if}

      <!-- Panel toggle button - mobile only -->
      {#if isMobile && !drawerOpen}
        <button
          onclick={() => {}}
          aria-label="Toggle panel"
          style="
            position: absolute;
            left: 80px;
            top: 20px;
            z-index: 1202;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0 30px 30px 0;
            cursor: pointer;
            min-width: 90px;
            min-height: 40px;
            background: transparent;
            border: none;
            transition: opacity 0.2s ease;
          "
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={currentTheme === 'dark' ? MSQDX_COLORS.brand.white : MSQDX_COLORS.brand.black}
          >
            {#if pageIcon === 'video_file'}
              <path
                d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
              />
            {:else if pageIcon === 'search'}
              <path
                d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
              />
            {:else if pageIcon === 'auto_awesome'}
              <path
                d="M19,9L20.25,6.25L23,5L20.25,3.75L19,1L17.75,3.75L15,5L17.75,6.25L19,9M19,15L17.75,17.75L15,19L17.75,20.25L19,23L20.25,20.25L23,19L20.25,17.75L19,15M11.5,9.5L9,4L6.5,9.5L1,12L6.5,14.5L9,20L11.5,14.5L17,12L11.5,9.5M9.88,12.58L9,13.88L8.12,12.58L6.82,11.7L8.12,10.82L9,9.52L9.88,10.82L11.18,11.7L9.88,12.58Z"
              />
            {:else if pageIcon === 'folder'}
              <path
                d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"
              />
            {:else if pageIcon === 'upload_file'}
              <path
                d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M15.5,11L12.5,14H14V18H16V14H17.5L15.5,11Z"
              />
            {:else}
              <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
            {/if}
          </svg>
        </button>
      {/if}
    </header>

    <!-- Content Area -->
    <main
      class="msqdx-glass-admin-content"
      style="
        flex: 1;
        overflow-x: hidden;
        overflow-y: auto;
        margin-top: -64px;
        padding: 32px 48px 48px;
        min-width: 0;
        max-width: 100%;
        width: 100%;
        transition: padding 0.3s ease;
      "
    >
      {#if title}
        <div style="margin-bottom: 1.5rem;">
          <h1
            style="font-size: {MSQDX_TYPOGRAPHY.fontSize[
              '2xl'
            ]}; margin-bottom: 0.5rem; font-weight: 600;"
          >
            {title}
          </h1>
          {#if subtitle}
            <p
              style="color: {currentTheme === 'dark'
                ? MSQDX_COLORS.dark.textSecondary
                : MSQDX_COLORS.light.textSecondary};"
            >
              {subtitle}
            </p>
          {/if}
        </div>
      {/if}

      <slot />
    </main>
  </div>

  <!-- Mobile Overlay for Navigation -->
  {#if drawerOpen && isMobile}
    <div
      onclick={handleDrawerClose}
      style="
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1099;
      "
    ></div>
  {/if}
</div>

<style>
  .msqdx-admin-layout {
    font-family: var(--font-noto-sans-jp, 'Noto Sans JP', sans-serif);
  }

  .msqdx-glass-admin-container {
    overflow-x: visible !important;
    overflow-y: visible !important;
  }

  .msqdx-glass-admin-header-bar {
    background: transparent;
    border-bottom: 0;
    position: relative;
    overflow: visible;
  }

  .msqdx-glass-admin-header-corner {
    position: absolute;
    top: -2px;
    left: -3px;
    width: 363px;
    height: 135px;
    z-index: -1;
    pointer-events: none;
    overflow: visible;
  }

  .msqdx-glass-admin-content {
    background: transparent;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  :global(html.dark) .msqdx-glass-admin-content {
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  :global(html.light) .msqdx-glass-admin-content {
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }

  .msqdx-glass-admin-content::-webkit-scrollbar {
    width: 8px;
  }

  .msqdx-glass-admin-content::-webkit-scrollbar-track {
    background: transparent;
    margin-left: 16px;
    margin-right: 8px;
  }

  .msqdx-glass-admin-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    border: 2px solid var(--color-neutral, #ffffff);
    background-clip: padding-box;
  }

  .msqdx-glass-admin-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  :global(html.light) .msqdx-glass-admin-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-color: #f8f6f0;
  }

  :global(html.light) .msqdx-glass-admin-content::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
</style>
