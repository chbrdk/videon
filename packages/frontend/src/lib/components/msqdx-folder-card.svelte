<script>
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { MsqdxGlassCard, MsqdxGlassMenu, MaterialSymbol } from '$lib/components/ui';
  import { createEventDispatcher } from 'svelte';

  export let folder;
  export let selected = false;
  export let onSelect = undefined;
  export let onContextMenu = undefined;
  export let className = '';

  const dispatch = createEventDispatcher();
  let showMenu = false;

  function handleClick() {
    goto(resolve(`/videos?folder=${folder.id}`));
  }

  function handleContextMenu(e) {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e, folder);
    }
  }
</script>

<MsqdxGlassCard
  hoverable={true}
  borderRadiusVariant="xxl"
  noPadding={true}
  class="folder-card {className} {selected ? 'selected' : ''}"
  on:click={handleClick}
  on:contextmenu={handleContextMenu}
  role="button"
  tabindex="0"
  style="
    --blur: var(--msqdx-glass-blur);
    --opacity: 0.05;
    --border-radius: var(--msqdx-radius-xxl);
    --padding: 0;
    --background-color: var(--msqdx-color-dark-paper);
    --border-color: var(--msqdx-color-brand-orange);
    --border-top-color: var(--msqdx-color-dark-border);
  "
>
  <!-- Top Right Actions -->
  <div class="absolute top-2 right-2 z-10 pointer-events-auto">
    <div class="relative">
      <button
        class="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--msqdx-color-brand-orange)] text-[var(--msqdx-color-brand-orange)] hover:bg-[var(--msqdx-color-brand-orange)] hover:text-white transition-colors bg-transparent"
        on:click|stopPropagation={() => (showMenu = !showMenu)}
      >
        <MaterialSymbol icon="more_vert" fontSize={20} />
      </button>

      {#if showMenu}
        <MsqdxGlassMenu
          align="right"
          items={[
            {
              label: 'Rename',
              icon: 'edit',
              action: () => dispatch('rename', folder),
            },
            {
              label: 'Delete',
              icon: 'delete',
              danger: true,
              action: () => dispatch('delete', folder),
            },
          ]}
          on:close={() => (showMenu = false)}
        />
      {/if}
    </div>
  </div>

  <div class="folder-icon">
    <MaterialSymbol icon="folder" fontSize={48} />
  </div>

  <div class="folder-content">
    <h3 class="folder-name">{folder.name}</h3>
    <div class="folder-meta">
      {folder.videoCount}
      {folder.videoCount === 1 ? 'Video' : 'Videos'}
    </div>
  </div>

  <div class="selection-indicator">
    {#if selected}
      <MaterialSymbol icon="check_circle" fontSize={24} />
    {/if}
  </div>
</MsqdxGlassCard>

<style>
  .folder-card {
    position: relative;
    min-height: 140px;
  }

  .folder-card :global(.msqdx-glass-card) {
    border-radius: 40px !important;
  }

  @media (min-width: 768px) {
    .folder-card :global(.msqdx-glass-card) {
      border-radius: 40px !important;
    }
  }

  .folder-card-draggable {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    user-select: none;
  }

  .folder-card:hover {
    transform: translateY(-2px);
  }

  .folder-card:focus {
    outline: 2px solid var(--msqdx-color-brand-orange);
    outline-offset: 2px;
  }

  .folder-card.selected {
    box-shadow: 0 0 0 2px var(--msqdx-color-brand-orange);
  }

  .folder-icon {
    color: var(--msqdx-color-dark-text-secondary);
    margin-bottom: var(--msqdx-spacing-sm);
    transition: color var(--msqdx-transition-standard);
  }

  .folder-card:hover .folder-icon {
    color: var(--msqdx-color-dark-text-primary);
  }

  .folder-content {
    text-align: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .folder-name {
    font-size: var(--msqdx-font-size-base);
    font-weight: var(--msqdx-font-weight-semibold);
    color: var(--msqdx-color-dark-text-primary);
    margin: 0 0 var(--msqdx-spacing-xs) 0;
    word-break: break-word;
    font-family: var(--msqdx-font-primary);
  }

  .folder-meta {
    font-size: var(--msqdx-font-size-sm);
    color: var(--msqdx-color-dark-text-secondary);
    font-weight: var(--msqdx-font-weight-medium);
    font-family: var(--msqdx-font-primary);
  }

  .selection-indicator {
    position: absolute;
    top: var(--msqdx-spacing-sm);
    right: var(--msqdx-spacing-sm);
    width: 24px;
    height: 24px;
    background: var(--msqdx-color-status-success);
    border-radius: var(--msqdx-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--msqdx-color-brand-white);
    opacity: 0;
    transform: scale(0);
    transition: all var(--msqdx-transition-standard);
  }

  .folder-card.selected .selection-indicator {
    opacity: 1;
    transform: scale(1);
  }

  /* Drag and drop styles */
  .folder-card[draggable='true']:hover {
    cursor: grab;
  }

  .folder-card[draggable='true']:active {
    cursor: grabbing;
  }
</style>
