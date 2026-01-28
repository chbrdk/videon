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
  import MsqdxAdminLayout from '$lib/components/ui/layout/MsqdxAdminLayout.svelte';

  // Load videos on mount only if not on a video detail page
  import { goto } from '$app/navigation';
  import { api } from '$lib/config/environment';

  // Load videos on mount only if not on a video detail page
  onMount(async () => {
    try {
      const res = await fetch(`${api.baseUrl}/auth/me`);
      const authData = await res.json();

      const publicRoutes = ['/login', '/register'];
      const currentPath = $page.url.pathname;
      // Check if current path starts with any public route (ignoring trailing slashes)
      const isPublic = publicRoutes.some(
        route => currentPath === route || currentPath.startsWith(`${route}/`)
      );

      if (!authData.isAuthenticated && !isPublic) {
        // Redirect to Login
        window.location.href = '/login';
        return;
      }

      if (authData.isAuthenticated && isPublic) {
        // Already logged in, go home
        goto('/');
        return;
      }
    } catch (e) {
      console.error('Auth Check Failed', e);
      // Fallback on error? Maybe assume unauthenticated?
    }

    if (!$page.params.id) {
      loadVideos();
    }

    // Initialize theme and locale
    theme.init();
    initI18n();
  });
</script>

<MsqdxAdminLayout>
  <slot />
</MsqdxAdminLayout>

<!-- Service Status Panel -->
<ServiceStatusPanel />

<!-- Global Context Menu -->
<GlobalContextMenu />
