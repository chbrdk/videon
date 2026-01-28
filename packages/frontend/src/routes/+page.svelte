<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { currentLocale } from '$lib/i18n';

  onMount(() => {
    // Redirect to video gallery (respects base path)
    goto(resolve('/videos'));
  });
</script>

<svelte:head>
  <title>Dashboard</title>
  <meta name="description" content="PrismVid Dashboard" />
</svelte:head>

<div class="flex justify-center items-center min-h-screen-minus-header">
  <div class="glass-card text-center py-16">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-6"></div>
    <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{$currentLocale === 'en' ? 'Redirecting...' : 'Weiterleitung...'}</h3>
    <p class="text-base text-gray-600 dark:text-white/70 mb-8">
      {$currentLocale === 'en' ? 'Redirecting to video gallery' : 'Weiterleitung zur Video-Gallery'}
    </p>
  </div>
</div>