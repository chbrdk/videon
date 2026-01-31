  import { createEventDispatcher } from 'svelte';
  import { MaterialSymbol } from '$lib/components/ui';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';

  const dispatch = createEventDispatcher();
  // Force Runes mode
  let { ...rest } = $props();

<div
  class="msqdx-glass-card group hoverable no-padding flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
  role="button"
  tabindex="0"
  onclick={() => dispatch('click')}
  onkeydown={e => e.key === 'Enter' && dispatch('click')}
  style="
    --blur: var(--msqdx-glass-blur);
    --opacity: 0.05;
    --border-radius: 40px;
    --padding: 0;
    --background-color: transparent;
    --border-color: var(--msqdx-color-brand-orange); 
    border-style: dashed !important;
    min-height: 200px;
    font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
  "
>
  <div class="flex flex-col items-center justify-center p-8 gap-4 text-center">
    <div
      class="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300"
      style="
        background-color: {MSQDX_COLORS.tints.orange};
        border: 1px solid {MSQDX_COLORS.brand.orange};
      "
    >
      <MaterialSymbol icon="add" fontSize={32} style="color: {MSQDX_COLORS.brand.orange};" />
    </div>
    <div>
      <h3
        class="font-medium text-lg mb-1"
        style="
          color: {MSQDX_COLORS.dark.textPrimary};
          font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
        "
      >
        Add New
      </h3>
      <p
        class="text-sm"
        style="
          color: {MSQDX_COLORS.dark.textSecondary};
          font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};
        "
      >
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
    border-radius: 40px !important;
  }

  .msqdx-glass-card.hoverable:hover {
    background-color: rgba(255, 255, 255, 0.08); /* Slightly lighter on hover */
    border-color: var(--msqdx-color-brand-orange);
  }
</style>
