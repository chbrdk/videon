<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale, fly } from 'svelte/transition';
  import { backOut, elasticOut } from 'svelte/easing';
  import { MaterialSymbol, MsqdxButton } from '$lib/components/ui';
  import { MSQDX_COLORS } from '$lib/design-tokens';

  export let x: number;
  export let y: number;
  export let items: Array<{
    label: string;
    icon: string;
    action: () => void;
    disabled?: boolean;
  }>;
  export let onClose = () => {};

  const dispatch = createEventDispatcher();

  // Configuration for radial layout
  const radius = 70;
  const itemSize = 38;
  const triggerSize = 44;

  let isOpen = false;
  let isClosing = false;
  let menuElement: HTMLElement;
  let visibleItems: Array<any> = [];

  onMount(() => {
    // Portaling: Move the element to document.body
    if (menuElement && typeof document !== 'undefined') {
      document.body.appendChild(menuElement);
    }

    // Small delay to ensure mount
    setTimeout(() => {
      isOpen = true;
      // Sequential add for items
      items.forEach((item, i) => {
        setTimeout(() => {
          if (isOpen && !isClosing) {
            visibleItems = [...visibleItems, { ...item, originalIndex: i }];
          }
        }, i * 50);
      });
    }, 10);

    function handleClickOutside(event: MouseEvent) {
      if (isClosing) return;

      const target = event.target as Node;
      // If we clicked something inside the menu, let the relative click handler handle it
      if (menuElement && menuElement.contains(target)) {
        return;
      }

      handleClose();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    // Non-capturing to avoid interfering with component clicks
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      // Clean up portal
      if (menuElement && menuElement.parentNode === document.body) {
        document.body.removeChild(menuElement);
      }
    };
  });

  function handleClose() {
    if (isClosing) return;
    isClosing = true;

    // Sequential remove for items
    const count = visibleItems.length;
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          visibleItems = visibleItems.slice(0, -1);
          if (visibleItems.length === 0) {
            isOpen = false;
            setTimeout(onClose, 200);
          }
        }, i * 30);
      }
    } else {
      isOpen = false;
      onClose();
    }
  }

  function handleItemClick(item: any) {
    if (!item.disabled && !isClosing) {
      // Execute the action (e.g., dispatch rename/delete)
      item.action();
      // Start closing animation
      handleClose();
    }
  }

  // Calculate position for each item
  function getItemPosition(index: number, total: number) {
    const isNearRight =
      typeof window !== 'undefined' && x > window.innerWidth - radius - itemSize - 40;
    const isNearBottom =
      typeof window !== 'undefined' && y > window.innerHeight - radius - itemSize - 40;
    const isNearLeft = typeof window !== 'undefined' && x < radius + itemSize + 40;
    const isNearTop = typeof window !== 'undefined' && y < radius + itemSize + 40;

    let start = -Math.PI / 2;
    let sweep = Math.PI / 2;

    if (total > 4) sweep = Math.PI * 0.7;

    if (isNearRight) {
      start = -Math.PI / 2;
      sweep = -Math.PI / 2;
      if (isNearBottom) start = -Math.PI;
    } else if (isNearBottom) {
      start = -Math.PI;
      sweep = Math.PI / 2;
    } else if (isNearLeft && isNearTop) {
      start = 0;
      sweep = Math.PI / 2;
    }

    if (total === 1) {
      return {
        x: x + Math.cos(start + sweep / 2) * radius,
        y: y + Math.sin(start + sweep / 2) * radius,
      };
    }

    const angle = start + (index / (total - 1)) * sweep;
    return {
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    };
  }
</script>

<div class="radial-menu-overlay" bind:this={menuElement} style="left: {x}px; top: {y}px;">
  {#if isOpen}
    <!-- Trigger / Close Button -->
    <div
      class="trigger-wrapper"
      transition:scale={{ duration: 250, easing: elasticOut }}
      style="width: {triggerSize}px; height: {triggerSize}px; margin-left: -{triggerSize /
        2}px; margin-top: -{triggerSize / 2}px;"
    >
      <MsqdxButton
        class="brand-close-btn"
        on:click={handleClose}
        variant="outlined"
        style="width: 100%; height: 100%; padding: 0; min-width: unset; background: white; border: 2px solid {MSQDX_COLORS
          .brand.orange};"
      >
        <MaterialSymbol icon="close" fontSize={24} color={MSQDX_COLORS.brand.orange} />
      </MsqdxButton>
    </div>

    <!-- Menu Items -->
    {#each visibleItems as item (item.originalIndex)}
      {@const pos = getItemPosition(item.originalIndex, items.length)}
      <div
        class="item-wrapper"
        style="left: {pos.x - x}px; top: {pos.y - y}px;"
        transition:fly={{
          x: -(pos.x - x) * 0.5,
          y: -(pos.y - y) * 0.5,
          duration: 300,
          easing: backOut,
        }}
      >
        <MsqdxButton
          class="brand-item-btn"
          disabled={item.disabled}
          on:click={() => handleItemClick(item)}
          variant="outlined"
          title={item.label}
          style="width: {itemSize}px; height: {itemSize}px; padding: 0; min-width: unset; background: white; border: 2px solid {MSQDX_COLORS
            .brand.orange};"
        >
          <MaterialSymbol icon={item.icon} fontSize={20} color={MSQDX_COLORS.brand.orange} />

          <!-- Tooltip label -->
          <span class="item-tooltip">{item.label}</span>
        </MsqdxButton>
      </div>
    {/each}
  {/if}
</div>

<style>
  .radial-menu-overlay {
    position: fixed;
    z-index: 10000; /* Higher than dialogs if needed, though portaling handles it */
    pointer-events: none;
  }

  .radial-menu-overlay :global(*) {
    pointer-events: auto;
  }

  .trigger-wrapper {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  :global(.brand-close-btn) {
    border-radius: 50% !important;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15) !important;
  }

  :global(.brand-close-btn:hover) {
    transform: scale(1.1) rotate(90deg) !important;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.2) !important;
  }

  .item-wrapper {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 5;
  }

  :global(.brand-item-btn) {
    border-radius: 50% !important;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: relative !important;
  }

  :global(.brand-item-btn:hover:not(.disabled)) {
    transform: scale(1.1) !important;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2) !important;
  }

  :global(.brand-item-btn:hover .item-tooltip) {
    opacity: 1;
    transform: translateX(-50%) translateY(-10px);
  }

  /* Tooltip Label - Adjusted to Light Theme as requested */
  .item-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(0);
    background: white;
    color: var(--msqdx-color-brand-orange, #ff6a3b);
    border: 1px solid var(--msqdx-color-brand-orange, #ff6a3b);
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 20;
  }

  @media (max-width: 768px) {
    :global(.brand-item-btn) {
      width: 32px !important;
      height: 32px !important;
    }
  }
</style>
