<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { loadVideos } from '$lib/stores/videos.store';
  import { page } from '$app/state';
  import { userStore } from '$lib/stores/user.store';
  import { theme } from '$lib/stores/theme.store';
  import { initI18n } from '$lib/i18n';
  import ServiceStatusPanel from '$lib/components/ServiceStatusPanel.svelte';
  import MsqdxAdminLayout from '$lib/components/ui/layout/MsqdxAdminLayout.svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { api } from '$lib/config/environment';
  import { isPathPublic } from '$lib/utils/routes';

  // Svelte 5 Props
  let { children } = $props();

  // Svelte 5 State - Mit ssr=false läuft alles clientseitig, window ist verfügbar
  // Bypass: localhost | VITE_DEV_BYPASS_AUTH | VITE_PUBLIC_BYPASS_AUTH (für Coolify/Staging)
  const devBypass = (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location?.hostname ?? '')) || (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') || (import.meta.env.VITE_PUBLIC_BYPASS_AUTH === 'true');
  let isCheckingAuth = $state(devBypass ? false : true);
  let isAuthenticated = $state(devBypass ? true : false);
  // Sofortige Initialisierung aus window.location (verhindert Spinner-Flash auf /login)
  let isPublicRoute = $state(typeof window !== 'undefined' ? isPathPublic(window.location.pathname) : false);
  let authStale = $state(false); // Spinner hängt > 8s

  if (devBypass) {
    userStore.set({ id: 'dev-user', email: 'dev@local', name: 'Dev User', role: 'USER' });
  }

  // Reactive Route Check: page aus $app/state + Fallback window.location
  $effect(() => {
    const pathFromPage = page?.url?.pathname;
    const path = pathFromPage ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    if (path) {
      isPublicRoute = isPathPublic(path);
    }
  });

  // One-time init and auth on mount (avoids $effect re-run loops)
  onMount(() => {
    theme.init();
    initI18n();
    // Sofort: Route aus window.location setzen (falls $effect noch nicht lief)
    if (typeof window !== 'undefined') {
      isPublicRoute = isPathPublic(window.location.pathname);
    }
    // Stale-Detection: Nach 8s Spinner Fehlermeldung anzeigen
    const staleId = setTimeout(() => {
      if (!devBypass && isCheckingAuth) authStale = true;
    }, 8000);
    // Timeout-Fallback: Bei hängendem Auth-Check nach 6s zu Login
    let authDone = false;
    const timeoutId = setTimeout(() => {
      if (!devBypass && !authDone) {
        authDone = true;
        isCheckingAuth = false;
        window.location.href = `${base ?? ''}/login`;
      }
    }, 6000);
    if (!devBypass) {
      checkAuth()
        .finally(() => {
          authDone = true;
          clearTimeout(timeoutId);
          clearTimeout(staleId);
        })
        .catch(() => {
          isCheckingAuth = false;
        });
    } else {
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

  async function checkAuth(): Promise<void> {
    const bypass = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' || import.meta.env.VITE_PUBLIC_BYPASS_AUTH === 'true';
    if (bypass) {
      isAuthenticated = true;
      isCheckingAuth = false;
      userStore.set({ id: 'dev-user', email: 'dev@local', name: 'Dev User', role: 'USER' });
      if (isPublicRoute) goto(`${base ?? ''}/`);
      return;
    }
    try {
      const baseUrl = api.baseUrl || '/api';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/auth/me`, { signal: controller.signal, credentials: 'include' });
      clearTimeout(timeoutId);
      const text = await res.text();
      let authData: { isAuthenticated?: boolean; user?: unknown } = { isAuthenticated: false };
      try {
        authData = text ? JSON.parse(text) : authData;
      } catch {
        console.warn('Layout: /auth/me returned non-JSON', text?.slice(0, 100));
      }
      isAuthenticated = !!authData.isAuthenticated;
      if (isAuthenticated && authData.user) {
        userStore.set(authData.user);
      }
      if (!isAuthenticated && import.meta.env.DEV) {
        isAuthenticated = true;
        userStore.set({ id: 'dev-user', email: 'dev@local', name: 'Dev User', role: 'USER' });
      }
    } catch (e) {
      console.error('Layout: Auth Check Failed', e);
      if (import.meta.env.DEV) {
        isAuthenticated = true;
        userStore.set({ id: 'dev-user', email: 'dev@local', name: 'Dev User', role: 'USER' });
      } else {
        isAuthenticated = false;
      }
    } finally {
      isCheckingAuth = false;
      // isPublicRoute aus window.location falls $effect noch nicht lief
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const publicRoute = isPathPublic(path) || isPublicRoute;
      if (!isAuthenticated && !publicRoute) {
        window.location.href = `${base ?? ''}/login`;
      } else if (isAuthenticated && publicRoute) {
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
  <div class="h-screen w-full flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-900">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      {authStale ? 'Verbindung zum Server dauert zu lange.' : 'Authentifizierung...'}
    </p>
    <div class="flex flex-col items-center gap-2">
      <a href={`${base ?? ''}/login`} class="text-sm text-primary-500 hover:underline font-medium">
        Zur Anmeldung
      </a>
      {#if authStale}
        <button
          type="button"
          class="text-xs text-gray-400 hover:text-gray-600 underline cursor-pointer bg-transparent border-none"
          on:click={() => window.location.reload()}
        >
          Seite neu laden
        </button>
      {/if}
    </div>
  </div>
{/if}

<!-- Global Components -->
<!-- <GlobalContextMenu /> -->
