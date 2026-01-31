<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  onMount(() => {
    // Weiterleitung zur Video-Gallery
    goto(`${base || '/videon'}/videos/`, { replaceState: true });
  });
</script>

<svelte:head>
  <title>Dashboard</title>
  <meta name="description" content="PrismVid Dashboard" />
</svelte:head>

<!-- Kurzer Platzhalter während der Navigation -->
<div class="min-h-screen flex items-center justify-center">
  <p class="text-gray-500 dark:text-gray-400">Weiterleitung zur Video-Gallery...</p>
</div>