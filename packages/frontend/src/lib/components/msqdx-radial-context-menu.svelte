<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale, fly } from 'svelte/transition';
  import { backOut, elasticOut } from 'svelte/easing';
  import { MaterialSymbol } from '$lib/components/ui';

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
  const radius = 120; // Radius of the arc in pixels
  const itemSize = 48;
  const triggerSize = 56;

  let isOpen = false;
  let menuElement: HTMLElement;

  onMount(() => {
    // Staggered open
    setTimeout(() => {
      isOpen = true;
    }, 10);

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

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
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
    <!-- Trigger / Close Button -->
    <button
      class="trigger-btn"
      on:click={handleClose}
      transition:scale={{ duration: 300, easing: elasticOut }}
      style="width: {triggerSize}px; height: {triggerSize}px; margin-left: -{triggerSize /
        2}px; margin-top: -{triggerSize / 2}px;"
    >
      <MaterialSymbol icon="close" fontSize={28} />
    </button>

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
        <button
          class="item-btn"
          class:disabled={item.disabled}
          on:click={() => handleItemClick(item)}
          title={item.label}
          style="width: {itemSize}px; height: {itemSize}px;"
        >
          <MaterialSymbol icon={item.icon} fontSize={24} />

          <!-- Tooltip label -->
          <span class="item-tooltip">{item.label}</span>
        </button>
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

  /* Central Trigger Button */
  .trigger-btn {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #d32f2f; /* Deeper red like in the image */
    color: white;
    border: 3px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow:
      0 10px 20px rgba(0, 0, 0, 0.4),
      0 6px 6px rgba(0, 0, 0, 0.3),
      inset 0 2px 4px rgba(255, 255, 255, 0.4);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 10;
  }

  .trigger-btn:hover {
    transform: scale(1.1) rotate(90deg);
    background: #b71c1c;
  }

  /* Individual Menu Items */
  .item-wrapper {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 5;
  }

  .item-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2d2d2d; /* Dark gray like the image */
    color: white;
    border: 3px solid white; /* Thick white border like the image */
    border-radius: 50%;
    cursor: pointer;
    box-shadow:
      0 8px 15px rgba(0, 0, 0, 0.4),
      0 4px 4px rgba(0, 0, 0, 0.2),
      inset 0 1px 3px rgba(255, 255, 255, 0.1);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .item-btn:hover:not(.disabled) {
    transform: scale(1.15);
    background: #1a1a1a;
    border-color: #ffffff;
    box-shadow:
      0 12px 25px rgba(0, 0, 0, 0.5),
      0 8px 8px rgba(0, 0, 0, 0.3);
  }

  .item-btn:hover .item-tooltip {
    opacity: 1;
    transform: translateX(-50%) translateY(-10px);
  }

  .item-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .item-btn {
      width: 40px !important;
      height: 40px !important;
    }
  }
</style>
