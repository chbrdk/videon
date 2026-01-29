<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { MaterialSymbol } from '$lib/components/ui';

  const dispatch = createEventDispatcher();
</script>

<div
  class="msqdx-glass-card group hoverable no-padding flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
  role="button"
  tabindex="0"
  on:click={() => dispatch('click')}
  on:keydown={e => e.key === 'Enter' && dispatch('click')}
  style="
    --blur: var(--msqdx-glass-blur);
    --opacity: 0.05;
    --border-radius: var(--msqdx-radius-xxl);
    --padding: 0;
    --background-color: var(--msqdx-color-dark-paper);
    --border-color: var(--msqdx-color-brand-orange); 
    border-style: dashed !important;
    min-height: 200px;
  "
>
  <div class="flex flex-col items-center justify-center p-8 gap-4 text-center">
    <div
      class="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300"
    >
      <MaterialSymbol icon="add" fontSize={32} class="text-white/60 group-hover:text-white" />
    </div>
    <div>
      <h3 class="font-medium text-lg text-white/80 group-hover:text-white mb-1">Add New</h3>
      <p class="text-sm text-white/40 group-hover:text-white/60">
        Upload video, create folder or project
      </p>
    </div>
  </div>
</div>

<style>
  .msqdx-glass-card {
    position: relative;
    overflow: hidden;
    transition: all var(--msqdx-transition-slow);
    display: flex;
    flex-direction: column;
    border-radius: var(--border-radius);
    padding: var(--padding);
    background-color: var(--background-color);
    backdrop-filter: blur(var(--blur));
    -webkit-backdrop-filter: blur(var(--blur));
    border: 1px dashed var(--border-color); /* Dashed border overridden inline but good to have here too */
  }

  /* Reusing styles from other cards to ensure consistency if global styles apply */
  .msqdx-glass-card.no-padding {
    padding: 0 !important;
    border-radius: var(--msqdx-radius-xxl) !important;
  }

  .msqdx-glass-card.hoverable:hover {
    background-color: rgba(255, 255, 255, 0.08); /* Slightly lighter on hover */
    border-color: var(--msqdx-color-brand-orange);
  }
</style>
