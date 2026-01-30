<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { loadVideos } from '$lib/stores/videos.store';
  import { page } from '$app/stores';
  import { userStore } from '$lib/stores/user.store';
  import { theme } from '$lib/stores/theme.store';
  import { currentLocale, _, initI18n } from '$lib/i18n';
  import { browser } from '$app/environment';
  import ServiceStatusPanel from '$lib/components/ServiceStatusPanel.svelte';
  import { contextMenuStore } from '$lib/stores/context-menu.store';
  import GlobalContextMenu from '$lib/components/GlobalContextMenu.svelte';
  import MsqdxAdminLayout from '$lib/components/ui/layout/MsqdxAdminLayout.svelte';

  // Load videos on mount only if not on a video detail page
  import { goto } from '$app/navigation';
  import { api } from '$lib/config/environment';

  // Load videos on mount only if not on a video detail page
  let isCheckingAuth = true;
  let isAuthenticated = false;
  let searching = false; // Defensive fix for ReferenceError

  $: currentPath = $page.url.pathname;
  $: isPublicRoute = ['/login', '/register'].some(
    r => currentPath === r || currentPath.startsWith(`${r}/`)
  );

  onMount(async () => {
    try {
      const res = await fetch(`${api.baseUrl}/auth/me`);
      const authData = await res.json();
      isAuthenticated = authData.isAuthenticated;
      if (isAuthenticated && authData.user) {
        userStore.set(authData.user);
      }
    } catch (e) {
      console.error('Auth Check Failed', e);
      isAuthenticated = false;
    } finally {
      isCheckingAuth = false;

      if (!isAuthenticated && !isPublicRoute) {
        window.location.href = '/login';
      } else if (isAuthenticated && isPublicRoute) {
        goto('/');
      }
    }

    if (!$page.params.id) {
      loadVideos();
    }

    // Initialize theme and locale
    theme.init();
    initI18n();
  });
</script>

{#if isPublicRoute}
  <!-- Public Layout (Full Page, no sidebar) -->
  <slot />
{:else if isAuthenticated && !isCheckingAuth}
  <!-- Protected Layout (Sidebar, etc.) -->
  <MsqdxAdminLayout>
    <slot />
  </MsqdxAdminLayout>

  <!-- Service Status Panel only for authenticated users -->
  <ServiceStatusPanel />
{:else}
  <!-- Loading State -->
  <div class="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
  </div>
{/if}

<!-- Global Context Menu (always handy) -->
<GlobalContextMenu />

<!-- Global Context Menu -->
<GlobalContextMenu />
