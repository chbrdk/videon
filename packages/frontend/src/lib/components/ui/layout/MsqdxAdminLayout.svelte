<script lang="ts">
  import { onMount } from 'svelte'; // Keep for now if needed, but prefer effect
  // Minimal Runes version
  let { title, subtitle, children }: { title?: string; subtitle?: string; children?: any } = $props();

  $effect(() => {
    console.log('MsqdxAdminLayout Mounted');
  });
</script>

<div class="msqdx-admin-layout-minimal" style="padding: 20px; border: 5px solid blue;">
  <h1>Minimal Admin Layout</h1>
  {#if children}
    {@render children()}
  {/if}
</div>
