<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { MsqdxGlassCard } from '$lib/components/ui';
  import { MaterialSymbol } from '$lib/components/ui';
  import { MSQDX_COLORS } from '$lib/design-tokens';

  export let items = [];
  export let align = 'right'; // 'left' or 'right'
  export let width = 200;

  const dispatch = createEventDispatcher();

  let menuElement;

  function handleClickOutside(event) {
    if (menuElement && !menuElement.contains(event.target)) {
      dispatch('close');
    }
  }

  function handleItemClick(item) {
    if (!item.disabled) {
      item.action();
      dispatch('close');
    }
  }

  onMount(() => {
    // Calculate position
    if (menuElement && menuElement.parentElement) {
      const parentRect = menuElement.parentElement.getBoundingClientRect();

      // Default to bottom-right alignment relative to parent
      let top = parentRect.bottom + 8;
      let left = align === 'right' ? parentRect.right - width : parentRect.left;

      // Check if it fits properties (basic check)
      if (left + width > window.innerWidth) {
        left = window.innerWidth - width - 16;
      }

      menuElement.style.top = `${top}px`;
      menuElement.style.left = `${left}px`;
      menuElement.style.position = 'fixed'; // Force fixed
    }

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div
  class="glass-menu-container"
  bind:this={menuElement}
  style="
    width: {width}px;
    z-index: 9999;
    opacity: 0;
  "
  on:click|stopPropagation
>
  <MsqdxGlassCard noPadding={true} borderRadiusVariant="md" class="glass-menu">
    <div class="menu-items">
      {#each items as item}
        <button
          class="menu-item"
          class:disabled={item.disabled}
          class:danger={item.danger}
          on:click|stopPropagation={() => handleItemClick(item)}
          disabled={item.disabled}
        >
          {#if item.icon}
            <div class="item-icon">
              <MaterialSymbol icon={item.icon} fontSize={18} />
            </div>
          {/if}
          <span class="item-label">{item.label}</span>
        </button>
      {/each}
    </div>
  </MsqdxGlassCard>
</div>

<style>
  .glass-menu-container {
    /* Position is set by JS */
    z-index: 9999;
    animation: menuIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .menu-items {
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--msqdx-color-dark-text-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .menu-item:hover:not(.disabled) {
    background: rgba(255, 255, 255, 0.1);
  }

  .menu-item.danger {
    color: var(--msqdx-color-status-error);
  }

  .menu-item.danger:hover:not(.disabled) {
    background: rgba(248, 113, 113, 0.1);
  }

  .menu-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
  }

  @keyframes menuIn {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
