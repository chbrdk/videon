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

  // Props (Svelte 5 Runes)
  let { children } = $props();

  // State using Runes
  let isCheckingAuth = $state(true);
  let isAuthenticated = $state(false);
  let isPublicRoute = $state(false); // Manual update to be safe

  // Update Route Check Reactively via Effect
  // This avoids complex mixed store/$derived syntax for now
  $effect(() => {
    if ($page.url) {
      const path = $page.url.pathname;
      isPublicRoute = ['/login', '/register'].some(r => path === r || path.startsWith(`${r}/`));
    }
  });

  // Initialization & Auth Check
  $effect(() => {
    // This runs once when component mounts
    console.log('Layout: Initializing via $effect');
    
    // Initialize services
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
      console.log('Layout: checking auth');
      // Use fallback if api.baseUrl is somehow broken (defensive)
      const baseUrl = api.baseUrl || '/api'; 
      const res = await fetch(`${baseUrl}/auth/me`);
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
  {@render children?.()}
{:else if isAuthenticated && !isCheckingAuth}
  <!-- Protected Layout (Sidebar, etc.) -->
  <MsqdxAdminLayout>
    {@render children?.()}
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
