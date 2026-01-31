<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { loadVideos } from '$lib/stores/videos.store';
  import { page } from '$app/state';
  import { userStore } from '$lib/stores/user.store';
  import { theme } from '$lib/stores/theme.store';
  import { initI18n } from '$lib/i18n';
  import ServiceStatusPanel from '$lib/components/ServiceStatusPanel.svelte';
  import GlobalContextMenu from '$lib/components/GlobalContextMenu.svelte';
  import MsqdxAdminLayout from '$lib/components/ui/layout/MsqdxAdminLayout.svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { api } from '$lib/config/environment';

  // Svelte 5 Props
  let { children } = $props();

  // Svelte 5 State - Mit ssr=false läuft alles clientseitig, window ist verfügbar
  // Dev-Bypass: localhost ODER VITE_DEV_BYPASS_AUTH=true
  const devBypass = (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location?.hostname ?? '')) || (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true');
  let isCheckingAuth = $state(devBypass ? false : true);
  let isAuthenticated = $state(devBypass ? true : false);
  let isPublicRoute = $state(false);

  if (devBypass) {
    userStore.set({ id: 'dev-user', email: 'dev@local', name: 'Dev User', role: 'USER' });
  }

  // Reactive Route Check (page from $app/state is reactive object, not store)
  $effect(() => {
    const p = page;
    if (p?.url?.pathname != null) {
      const path = p.url.pathname;
      // Base-aware: /videon/login or /login both match
      isPublicRoute = ['/login', '/register'].some(
        (r) => path === r || path === `${r}/` || path.endsWith(r) || path.endsWith(`${r}/`)
      );
    }
  });

  // One-time init and auth on mount (avoids $effect re-run loops)
  onMount(() => {
    theme.init();
    initI18n();
    if (!devBypass) {
      checkAuth();
    } else {
      // Dev-Bypass: zusätzlicher Fallback falls initialer State nicht griff
      isAuthenticated = true;
      isCheckingAuth = false;
      userStore.set({ id: 'dev-user', email: 'dev@local', name: 'Dev User', role: 'USER' });
    }
  });

  // Data Loading (when authenticated)
  $effect(() => {
    const p = page;
    const params = p?.params;
    if (isAuthenticated && !isCheckingAuth && params != null && !params.id) {
      loadVideos().catch(() => {});
    }
  });

  async function checkAuth() { 
    const devBypass = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
    if (devBypass) {
      isAuthenticated = true;
      isCheckingAuth = false;
      userStore.set({ id: 'dev-user', email: 'dev@local', name: 'Dev User', role: 'USER' });
      if (isPublicRoute) goto(`${base ?? ''}/`);
      return;
    }
    try {
      const baseUrl = api.baseUrl || '/api'; 
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${baseUrl}/auth/me`, { signal: controller.signal, credentials: 'include' });
      clearTimeout(timeoutId);
      const authData = await res.json();
      isAuthenticated = authData.isAuthenticated;
      if (isAuthenticated && authData.user) {
        userStore.set(authData.user);
      }
      // Dev-Fallback: Ohne Session trotzdem einloggen, damit UI sichtbar ist
      if (!isAuthenticated && import.meta.env.DEV) {
        isAuthenticated = true;
        userStore.set({ id: 'dev-user', email: 'dev@local', name: 'Dev User', role: 'USER' });
      }
    } catch (e) {
      console.error('Layout: Auth Check Failed', e);
      // Dev-Fallback: Bei Fehler (z.B. Backend nicht erreichbar) trotzdem einloggen
      if (import.meta.env.DEV) {
        isAuthenticated = true;
        userStore.set({ id: 'dev-user', email: 'dev@local', name: 'Dev User', role: 'USER' });
      } else {
        isAuthenticated = false;
      }
    } finally {
      isCheckingAuth = false;
      if (!isAuthenticated && !isPublicRoute) {
        window.location.href = `${base ?? ''}/login`;
      } else if (isAuthenticated && isPublicRoute) {
        goto(`${base ?? ''}/`);
      }
    }
  }
</script>

{#if isPublicRoute}
  <!-- Public Layout -->
  {#if children}{@render children()}{/if}
{:else if isAuthenticated && !isCheckingAuth}
  <!-- Protected Layout -->
  <MsqdxAdminLayout>
    {#if children}{@render children()}{/if}
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
<!-- <GlobalContextMenu /> -->
