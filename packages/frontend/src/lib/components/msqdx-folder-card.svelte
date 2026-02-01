<script>
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { MsqdxGlassCard, MaterialSymbol } from '$lib/components/ui';
  import MsqdxRadialContextMenu from '$lib/components/msqdx-radial-context-menu.svelte';
  import { createEventDispatcher } from 'svelte';

  export let folder;
  export let selected = false;
  export let onSelect = undefined;
  export let onContextMenu = undefined;
  export let className = '';

  const dispatch = createEventDispatcher();
  let showMenu = false;
  let menuX = 0;
  let menuY = 0;

  function handleMenuToggle(event) {
    menuX = event.clientX;
    menuY = event.clientY;
    showMenu = !showMenu;
  }

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
>
  <div draggable="true" class="folder-card-draggable">
    <!-- Top Right Actions -->
    <div class="absolute top-2 right-2 z-10 pointer-events-auto">
      <div class="relative">
        <button
          class="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--msqdx-color-brand-orange)] text-[var(--msqdx-color-brand-orange)] hover:bg-[var(--msqdx-color-brand-orange)] hover:text-white transition-colors bg-transparent"
          on:click|stopPropagation={handleMenuToggle}
        >
          <MaterialSymbol icon="more_vert" fontSize={20} />
        </button>

        {#if showMenu}
          <MsqdxRadialContextMenu
            x={menuX}
            y={menuY}
            items={[
              {
                label: 'Rename',
                icon: 'edit',
                action: () => dispatch('rename', folder),
              },
              {
                label: 'Delete',
                icon: 'delete',
                action: () => dispatch('delete', folder),
              },
            ]}
            onClose={() => (showMenu = false)}
          />
        {/if}
      </div>
    </div>

    <div class="folder-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"
        />
      </svg>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" />
        </svg>
      {/if}
    </div>
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
