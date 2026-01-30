<script lang="ts">
  import '../app.css';
  import { loadVideos } from '$lib/stores/videos.store';
  import { page } from '$app/stores';
  import { userStore } from '$lib/stores/user.store';
  import { theme } from '$lib/stores/theme.store';
  import { initI18n } from '$lib/i18n';
  import ServiceStatusPanel from '$lib/components/ServiceStatusPanel.svelte';
  import GlobalContextMenu from '$lib/components/GlobalContextMenu.svelte';
  import MsqdxAdminLayout from '$lib/components/ui/layout/MsqdxAdminLayout.svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/config/environment';

  // State using Runes
  let isCheckingAuth = $state(true);
  let isAuthenticated = $state(false);

  // Derived state for public route check
  // We use a reactive statement that updates based on $page store
  let isPublicRoute = $derived(
    $page.url &&
      ['/login', '/register'].some(
        r => $page.url.pathname === r || $page.url.pathname.startsWith(`${r}/`)
      )
  );

  // Initialization Effect
  $effect(() => {
    // This runs once when component mounts in the browser
    console.log('Layout: Initializing via $effect');
    theme.init();
    initI18n();

    // Perform Auth Check
    checkAuth();

    // Load videos if valid
    if ($page.params && !$page.params.id) {
      loadVideos();
    }
  });

  async function checkAuth() {
    try {
      if (isPublicRoute) {
        // Optimization: minimal check or skip if purely public
        // validation happens below
      }

      console.log('Layout: checking auth');
      const res = await fetch(`${api.baseUrl}/auth/me`);
      const authData = await res.json();
      isAuthenticated = authData.isAuthenticated;

      if (isAuthenticated && authData.user) {
        userStore.set(authData.user);
      }
    } catch (e) {
      console.error('Layout: Auth Check Failed', e);
      isAuthenticated = false;
    } finally {
      isCheckingAuth = false; // Stop spinner

      // Redirect logic
      if (!isAuthenticated && !isPublicRoute) {
        window.location.href = '/login';
      } else if (isAuthenticated && isPublicRoute) {
        goto('/');
      }
    }
  }
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
