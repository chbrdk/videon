<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { MsqdxGlassCard } from '$lib/components/ui';

  export let x;
  export let y;
  export let items;
  export let onClose = () => {};
  export let className = '';

  const dispatch = createEventDispatcher();

  let menuElement;

  onMount(() => {
    function handleClickOutside(event) {
      if (menuElement && !menuElement.contains(event.target)) {
        onClose();
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  });

  function handleItemClick(item) {
    if (!item.disabled) {
      item.action();
      onClose();
    }
  }
</script>

<MsqdxGlassCard
  class="context-menu {className}"
  style="position: fixed; top: {y}px; left: {x}px; z-index: 1000; min-width: 200px;"
  bind:this={menuElement}
  role="menu"
  noPadding={true}
>
  {#each items as item}
    <button 
      class="context-menu-item"
      class:disabled={item.disabled}
      on:click={() => handleItemClick(item)}
      role="menuitem"
      disabled={item.disabled}
    >
      <div class="item-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          {#if item.icon === 'edit'}
            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
          {:else if item.icon === 'delete'}
            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
          {:else if item.icon === 'folder'}
            <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
          {:else if item.icon === 'move'}
            <path d="M13,9V3.5L22,12L13,20.5V15C7,15 4.5,18 4,22C5.5,17 8,14 13,14V9Z"/>
          {:else}
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
          {/if}
        </svg>
      </div>
      <span class="item-label">{item.label}</span>
    </button>
  {/each}
</MsqdxGlassCard>

<style>
  .context-menu {
    position: fixed;
    z-index: 1000;
    min-width: 200px;
    background: var(--msqdx-color-dark-paper);
    backdrop-filter: blur(var(--msqdx-glass-blur));
    border: 1px solid var(--msqdx-color-dark-border);
    border-radius: var(--msqdx-radius-md);
    padding: var(--msqdx-spacing-xs);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: contextMenuIn var(--msqdx-transition-fast) ease-out;
  }

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-sm);
    width: 100%;
    padding: var(--msqdx-spacing-sm) var(--msqdx-spacing-md);
    background: transparent;
    border: none;
    border-radius: var(--msqdx-radius-sm);
    color: var(--msqdx-color-dark-text-primary);
    font-size: var(--msqdx-font-size-sm);
    font-weight: var(--msqdx-font-weight-medium);
    font-family: var(--msqdx-font-primary);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
    text-align: left;
  }

  .context-menu-item:hover:not(.disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: var(--msqdx-color-dark-text-primary);
  }

  .context-menu-item:focus {
    outline: 2px solid var(--msqdx-color-brand-orange);
    outline-offset: 2px;
  }

  .context-menu-item.disabled {
    color: var(--msqdx-color-dark-text-secondary);
    cursor: not-allowed;
  }

  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .item-label {
    flex: 1;
  }

  @keyframes contextMenuIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
