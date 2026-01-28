<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { theme } from '$lib/stores/theme.store';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { api } from '$lib/config/environment';
  import { MSQDX_COLORS, MSQDX_SPACING, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { MaterialSymbol } from '$lib/components/ui';

  let { open = false, onClose = () => {} }: { open?: boolean; onClose?: () => void } = $props();

  let expanded = $state(false);
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

  function handleToggleExpand() {
    expanded = !expanded;
  }

  async function handleLogout() {
    try {
      await fetch(`${api.baseUrl}/auth/logout`, { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  function handleItemClick() {
    if (mounted && isMobile) {
      onClose();
    }
  }

  function isActive(path: string) {
    const currentPath = $page.url.pathname;
    const fullPath = `${base}${path}`;
    if (path === '/videos') {
      return currentPath === `${base}/videos` || currentPath === `${base}/videos/`;
    }
    return currentPath?.startsWith(fullPath) ?? false;
  }

  const navItems = [
    { label: 'Videos', path: '/videos', icon: 'video_file' },
    { label: 'Suche', path: '/search', icon: 'search' },
    { label: 'KI Creator', path: '/ai-creator', icon: 'auto_awesome' },
    { label: 'Projekte', path: '/projects', icon: 'folder' },
    { label: 'Hochladen', path: '/upload', icon: 'upload_file' },
  ];

  let isExpanded = $derived(mounted && isMobile ? open : mounted ? expanded : false);
  let sidebarWidth = $derived(
    isExpanded ? (isMobile ? '95%' : '240px') : isMobile ? '95%' : '64px'
  );
</script>

<nav
  class="msqdx-glass-admin-nav"
  class:expanded={isExpanded}
  style="
    position: {isMobile ? 'fixed' : 'relative'};
    transform: {isMobile ? (open ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)'};
    width: {sidebarWidth};
    z-index: {isMobile ? 1200 : 'auto'};
    background-color: var(--msqdx-color-brand-orange);
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(20px);
  "
>
  {#if mounted && isMobile}
    <div class="nav-close-button">
      <button
        on:click={onClose}
        aria-label="Close navigation"
        style="
          color: #ffffff;
          padding: {isMobile ? '1.5rem' : '0.5rem'};
          width: {isMobile ? '96px' : '40px'};
          height: {isMobile ? '96px' : '40px'};
        "
      >
        <MaterialSymbol icon="close" fontSize={28} />
      </button>
    </div>
  {/if}

  <div class="nav-list-wrapper">
    <ul class="nav-list" style="align-items: {isExpanded ? 'stretch' : 'center'};">
      {#if !isMobile}
        <li class="nav-item">
          <button
            on:click={handleToggleExpand}
            aria-label={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
            style="
            width: {isExpanded ? 'calc(100% - 0.5rem)' : '40px'};
            justify-content: {isExpanded ? 'flex-start' : 'center'};
          "
          >
            <MaterialSymbol
              icon={isExpanded ? 'menu_open' : 'menu'}
              fontSize={28}
              style="margin-right: {isExpanded ? '0.75rem' : '0'};"
            />
            {#if isExpanded}
              <span
                style="
              font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
              font-size: {isMobile
                  ? MSQDX_TYPOGRAPHY.fontSize.lg
                  : MSQDX_TYPOGRAPHY.fontSize.body2};
              font-weight: {MSQDX_TYPOGRAPHY.fontWeight.regular};
              line-height: {MSQDX_TYPOGRAPHY.lineHeight.normal};
              color: rgba(255, 255, 255, 0.7);
            ">Menu</span
              >
            {/if}
          </button>
        </li>
      {/if}

      {#each navItems as item}
        {@const active = isActive(item.path)}
        <li class="nav-item">
          <a
            href={`${base}${item.path}`}
            on:click={e => {
              e.preventDefault();
              handleItemClick();
              goto(`${base}${item.path}`);
            }}
            class:active
            title={!isExpanded ? item.label : undefined}
            style="
            width: {isExpanded ? 'calc(100% - 0.5rem)' : isMobile ? '60px' : '40px'};
            height: {isMobile ? '60px' : '40px'};
            justify-content: {isExpanded ? 'flex-start' : 'center'};
            background-color: {active ? 'rgba(255, 255, 255, 0.15)' : 'transparent'};
            color: {active ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'};
            border-left: {active ? '3px solid #ffffff' : '3px solid transparent'};
            font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
            font-size: {isMobile ? MSQDX_TYPOGRAPHY.fontSize.lg : MSQDX_TYPOGRAPHY.fontSize.body2};
            font-weight: {active
              ? MSQDX_TYPOGRAPHY.fontWeight.semibold
              : MSQDX_TYPOGRAPHY.fontWeight.regular};
          "
          >
            <MaterialSymbol
              icon={item.icon}
              fontSize={28}
              style="margin-right: {isExpanded ? (isMobile ? '1rem' : '0.75rem') : '0'};"
            />
            {#if isExpanded}
              <span
                style="
              font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
              font-size: {isMobile
                  ? MSQDX_TYPOGRAPHY.fontSize.lg
                  : MSQDX_TYPOGRAPHY.fontSize.body2};
              font-weight: {active
                  ? MSQDX_TYPOGRAPHY.fontWeight.semibold
                  : MSQDX_TYPOGRAPHY.fontWeight.regular};
              line-height: {MSQDX_TYPOGRAPHY.lineHeight.normal};
            ">{item.label}</span
              >
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  </div>

  <div class="nav-footer">
    <a
      href="/settings"
      on:click={e => {
        handleItemClick();
      }}
      title="Settings"
      class:active={isActive('/settings')}
      style="
        width: {isExpanded ? 'calc(100% - 0.5rem)' : isMobile ? '60px' : '40px'};
        height: {isMobile ? '60px' : '40px'};
        justify-content: {isExpanded ? 'flex-start' : 'center'};
        font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
        font-size: {isMobile ? MSQDX_TYPOGRAPHY.fontSize.lg : MSQDX_TYPOGRAPHY.fontSize.body2};
      "
    >
      <MaterialSymbol
        icon="settings"
        fontSize={28}
        style="margin-right: {isExpanded ? (isMobile ? '1rem' : '0.75rem') : '0'};"
      />
      {#if isExpanded}
        <span style="font-weight: {MSQDX_TYPOGRAPHY.fontWeight.regular};">Settings</span>
      {/if}
    </a>

    <button
      on:click={() => theme.toggle()}
      aria-label="Toggle theme"
      style="
        width: {isExpanded ? 'calc(100% - 0.5rem)' : isMobile ? '60px' : '40px'};
        height: {isMobile ? '60px' : '40px'};
        justify-content: {isExpanded ? 'flex-start' : 'center'};
      "
    >
      <MaterialSymbol
        icon={$theme === 'dark' ? 'light_mode' : 'dark_mode'}
        fontSize={28}
        style="margin-right: {isExpanded ? (isMobile ? '1rem' : '0.75rem') : '0'};"
      />
      {#if isExpanded}
        <span
          style="
          font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
          font-size: {isMobile ? MSQDX_TYPOGRAPHY.fontSize.lg : MSQDX_TYPOGRAPHY.fontSize.body2};
          font-weight: {MSQDX_TYPOGRAPHY.fontWeight.regular};
          line-height: {MSQDX_TYPOGRAPHY.lineHeight.normal};
          color: rgba(255, 255, 255, 0.7);
        ">{$theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span
        >
      {/if}
    </button>
    <button
      on:click={handleLogout}
      title="Sign Out"
      style="
        width: {isExpanded ? 'calc(100% - 0.5rem)' : isMobile ? '60px' : '40px'};
        height: {isMobile ? '60px' : '40px'};
        justify-content: {isExpanded ? 'flex-start' : 'center'};
        color: #f87171;
      "
    >
      <MaterialSymbol
        icon="logout"
        fontSize={28}
        style="margin-right: {isExpanded ? (isMobile ? '1rem' : '0.75rem') : '0'};"
      />
      {#if isExpanded}
        <span style="font-weight: {MSQDX_TYPOGRAPHY.fontWeight.regular};">Sign Out</span>
      {/if}
    </button>
  </div>
</nav>

<style>
  .msqdx-glass-admin-nav {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.75rem 0.5rem;
    transition:
      width 0.3s ease,
      transform 0.3s ease;
  }

  .nav-close-button {
    display: flex;
    justify-content: flex-end;
    padding: 0.5rem;
    padding-top: 1rem;
  }

  .nav-close-button button {
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .nav-close-button button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .nav-list-wrapper {
    flex: 1;
    position: relative;
    min-height: 0;
    width: 100%;
  }

  .nav-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: 0;
    right: 0;
  }

  .nav-item {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .nav-item button,
  .nav-item a {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    margin: 0;
    border-radius: 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-item button:hover,
  .nav-item a:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .nav-item a.active {
    background-color: rgba(255, 255, 255, 0.15);
  }

  .nav-item a.active:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .nav-footer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    margin-top: auto;
    padding-bottom: 1rem;
  }

  .nav-footer button,
  .nav-footer a {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.7);
  }

  .nav-footer button:hover,
  .nav-footer a:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }
</style>
