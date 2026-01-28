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
  onMount(() => {
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
