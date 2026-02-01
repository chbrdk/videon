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

  // Configuration for radial layout - Reduced radius as requested
  const radius = 80;
  const itemSize = 48;
  const triggerSize = 56;

  let isOpen = false;
  let menuElement: HTMLElement;

  onMount(() => {
    // Portaling: Move the element to document.body to avoid transform/overflow issues
    if (menuElement && typeof document !== 'undefined') {
      document.body.appendChild(menuElement);
    }

    // Staggered open
    isOpen = true;

    function handleClickOutside(event: MouseEvent) {
      if (menuElement && !menuElement.contains(event.target as Node)) {
        handleClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
      // Clean up portal
      if (menuElement && menuElement.parentNode === document.body) {
        document.body.removeChild(menuElement);
      }
    };
  });

  function handleClose() {
    isOpen = false;
    setTimeout(onClose, 300); // Wait for transition
  }

  function handleItemClick(item: any) {
    if (!item.disabled) {
      item.action();
      handleClose();
    }
  }

  // Calculate position for each item
  function getItemPosition(index: number, total: number) {
    // Detect screen quadrants for better arc direction
    const isNearRight =
      typeof window !== 'undefined' && x > window.innerWidth - radius - itemSize - 40;
    const isNearBottom =
      typeof window !== 'undefined' && y > window.innerHeight - radius - itemSize - 40;
    const isNearLeft = typeof window !== 'undefined' && x < radius + itemSize + 40;
    const isNearTop = typeof window !== 'undefined' && y < radius + itemSize + 40;

    // Normal arc: Top-Right (-90 to 0)
    let start = -Math.PI / 2;
    let sweep = Math.PI / 2;

    // If we have many items, use a larger sweep
    if (total > 4) sweep = Math.PI * 0.7;

    if (isNearRight) {
      start = -Math.PI / 2;
      sweep = -Math.PI / 2;
      if (isNearBottom) start = -Math.PI; // Bottom-right: Up and Left
    } else if (isNearBottom) {
      start = -Math.PI; // Bottom: Go up and right
      sweep = Math.PI / 2;
    } else if (isNearLeft && isNearTop) {
      start = 0; // Top-left: Go down and right
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
    <!-- Trigger / Close Button - Using Brand Component -->
    <div
      class="trigger-wrapper"
      transition:scale={{ duration: 300, easing: elasticOut }}
      style="width: {triggerSize}px; height: {triggerSize}px; margin-left: -{triggerSize /
        2}px; margin-top: -{triggerSize / 2}px;"
    >
      <MsqdxButton
        class="brand-close-btn"
        on:click={handleClose}
        variant="contained"
        style="width: 100%; height: 100%; padding: 0; min-width: unset; background: {MSQDX_COLORS
          .brand.orange};"
      >
        <MaterialSymbol icon="close" fontSize={28} color="white" />
      </MsqdxButton>
    </div>

    <!-- Menu Items -->
    {#each items as item, i}
      {@const pos = getItemPosition(i, items.length)}
      <div
        class="item-wrapper"
        style="left: {pos.x - x}px; top: {pos.y - y}px;"
        transition:fly={{
          x: -(pos.x - x),
          y: -(pos.y - y),
          duration: 400 + i * 50,
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
          <MaterialSymbol icon={item.icon} fontSize={24} color={MSQDX_COLORS.brand.orange} />

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
    z-index: 9999;
    pointer-events: none;
  }

  .radial-menu-overlay :global(*) {
    pointer-events: auto;
  }

  /* Wrapper for Trigger/Close Button to handle sizing and centering */
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
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3) !important;
  }

  :global(.brand-close-btn:hover) {
    transform: scale(1.1) rotate(90deg) !important;
  }

  /* Individual Menu Items */
  .item-wrapper {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 5;
  }

  :global(.brand-item-btn) {
    border-radius: 50% !important;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: relative !important;
  }

  :global(.brand-item-btn:hover:not(.disabled)) {
    transform: scale(1.15) !important;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3) !important;
  }

  :global(.brand-item-btn:hover .item-tooltip) {
    opacity: 1;
    transform: translateX(-50%) translateY(-10px);
  }

  /* Tooltip Label */
  .item-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(0);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 20;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    :global(.brand-item-btn) {
      width: 40px !important;
      height: 40px !important;
    }
  }
</style>
