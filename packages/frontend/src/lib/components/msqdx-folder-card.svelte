<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { _ } from '$lib/i18n';
  import { MaterialSymbol } from '$lib/components/ui';
  import MsqdxCardMenu from '$lib/components/msqdx-card-menu.svelte';
  import { createEventDispatcher } from 'svelte';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';

  export let folder: any; // Using any to avoid strict type issues for now, similar to before
  export let selected = false;
  export let onSelect: ((folder: any) => void) | undefined = undefined;
  export let onContextMenu: ((e: MouseEvent, folder: any) => void) | undefined = undefined;
  export let className = '';

  const dispatch = createEventDispatcher();

  function handleClick() {
    if (onSelect) {
      onSelect(folder);
    } else {
      goto(resolve(`/videos?folder=${folder.id}`));
    }
  }

  function handleContextMenu(e: MouseEvent) {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(e, folder);
    }
  }

  function handleMenuAction(action: string) {
    dispatch(action, folder);
  }
</script>

<div
  class="msqdx-glass-card cursor-pointer transition-transform hover:scale-105 relative group {className} {selected
    ? 'selected'
    : ''}"
  on:click={handleClick}
  on:contextmenu={handleContextMenu}
  role="button"
  tabindex="0"
  style="
    --blur: var(--msqdx-glass-blur);
    --background-color: var(--msqdx-color-dark-paper);
    --border-color: {selected ? MSQDX_COLORS.brand.blue : 'var(--msqdx-color-dark-border)'};
    border-radius: 40px;
  "
>
  <!-- Folder Menu -->
  <MsqdxCardMenu
    items={[
      { label: _('actions.rename'), icon: 'edit', action: () => handleMenuAction('rename') },
      {
        label: _('actions.share') ?? 'Share',
        icon: 'share',
        action: () => handleMenuAction('share'),
      },
      {
        label: _('actions.delete'),
        icon: 'delete',
        danger: true,
        action: () => handleMenuAction('delete'),
      },
    ]}
  />

  <div class="flex flex-col items-center justify-center p-6 h-full text-center gap-3">
    <div
      class="w-12 h-12 rounded-full flex items-center justify-center"
      style="background-color: {MSQDX_COLORS.tints.blue};"
    >
      <MaterialSymbol icon="folder" fontSize={24} style="color: {MSQDX_COLORS.brand.blue};" />
    </div>
    <h3
      class="font-semibold leading-tight line-clamp-2"
      style="
        color: {MSQDX_COLORS.dark.textPrimary};
        font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
      "
    >
      {folder.name}
    </h3>
    <span
      class="text-xs"
      style="
        color: {MSQDX_COLORS.dark.textSecondary};
        font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};
      "
    >
      {folder.videoCount}
      {folder.videoCount === 1 ? 'Video' : 'Videos'}
    </span>
  </div>

  <!-- Selection Indicator -->
  {#if selected}
    <div class="absolute top-2 left-2 z-10 selection-indicator">
      <MaterialSymbol icon="check_circle" fontSize={24} style="color: {MSQDX_COLORS.brand.blue};" />
    </div>
  {/if}
</div>

<style>
  .msqdx-glass-card {
    position: relative;
    overflow: hidden;
    transition: all var(--msqdx-transition-slow);
    display: flex;
    flex-direction: column;
    /* Glass Effect properties */
    backdrop-filter: blur(var(--blur));
    -webkit-backdrop-filter: blur(var(--blur));
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
    min-height: 200px; /* Match project card height approximate */
  }

  .msqdx-glass-card.selected {
    box-shadow: 0 0 0 2px var(--msqdx-color-brand-blue, #3b82f6);
  }
</style>
