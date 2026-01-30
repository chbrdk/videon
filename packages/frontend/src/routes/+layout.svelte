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

  // Svelte 5 Props
  let { children } = $props();

  // Svelte 5 State
  let isCheckingAuth = $state(true);
  let isAuthenticated = $state(false);
  let isPublicRoute = $state(false); 

  // Reactive Route Check
  $effect(() => {
    if ($page.url) {
      const path = $page.url.pathname;
      isPublicRoute = ['/login', '/register'].some(r => path === r || path.startsWith(`${r}/`));
    }
  });

  // Initialization & Auth
  $effect(() => {
    // Initialize services
    theme.init();
    initI18n();
    
    // Auth Check
    checkAuth();

    // Data Loading
    if ($page.params && !$page.params.id) {
       loadVideos();
    }
  });

  async function checkAuth() { 
    try {
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
      isCheckingAuth = false;
      // Redirect Logic
      if (!isAuthenticated && !isPublicRoute) {
        window.location.href = '/login';
      } else if (isAuthenticated && isPublicRoute) {
        goto('/');
      }
    }
  }
</script>

{#if isPublicRoute}
  <!-- Public Layout -->
  {@render children?.()}
{:else if isAuthenticated && !isCheckingAuth}
  <!-- Protected Layout -->
  <MsqdxAdminLayout>
    {@render children?.()}
  </MsqdxAdminLayout>

  <!-- Service Status Panel -->
  <ServiceStatusPanel />
{:else}
  <!-- Loading State -->
  <div class="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
  </div>
{/if}

<!-- Global Components -->
<GlobalContextMenu />
