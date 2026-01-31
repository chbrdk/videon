<script lang="ts">
  import { contextMenuStore } from '$lib/stores/context-menu.store';
  import { MaterialSymbol } from '$lib/components/ui';
  
  function handleAction(action: string, segment: any) {
    window.dispatchEvent(new CustomEvent(`contextmenu-${action}`, { detail: segment }));
    contextMenuStore.set(null);
  }
</script>

{#if $contextMenuStore}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="context-menu glass-card"
    style="top: {$contextMenuStore.y}px; left: {$contextMenuStore.x}px;"
    role="dialog" 
    tabindex="-1"
    on:click|stopPropagation
  >
    <button on:click={() => handleAction('play', $contextMenuStore!.segment)}>
      <span class="icon-18px"><MaterialSymbol icon="play_arrow" fontSize={18} /></span> Play Segment
    </button>
    <button on:click={() => handleAction('edit', $contextMenuStore!.segment)}>
      <span class="icon-18px"><MaterialSymbol icon="edit" fontSize={18} /></span> Edit Text
    </button>
    <button on:click={() => handleAction('revoice', $contextMenuStore!.segment)}>
      <span class="icon-18px"><MaterialSymbol icon="mic" fontSize={18} /></span> Re-Voice
    </button>
    <div class="divider"></div>
    <button class="danger" on:click={() => handleAction('delete', $contextMenuStore!.segment)}>
      <span class="icon-18px"><MaterialSymbol icon="delete" fontSize={18} /></span> Delete
    </button>
  </div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <button class="context-menu-overlay" on:click={() => contextMenuStore.set(null)} aria-label="Close menu"></button>
{/if}

<style>
  .context-menu {
    position: fixed !important;
    z-index: 10000;
    padding: 8px;
    min-width: 200px;
    background: transparent;
    border: none;
    border-radius: 8px;
    backdrop-filter: blur(10px);
    transform: none !important;
  }

  .context-menu button {
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .icon-18px {
    display: inline-block;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .context-menu button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .context-menu button.danger:hover {
    background: rgba(255, 0, 0, 0.2);
    color: #ff4444;
  }

  .divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 4px 0;
  }

  html.dark .context-menu {
    background: rgba(20, 20, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    color: #fff;
  }

  html.dark .divider {
    background: rgba(255, 255, 255, 0.1);
  }

  html.light .context-menu {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    color: #111;
  }

  html.light .context-menu button {
    color: #111;
  }

  html.light .context-menu button:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  html.light .context-menu button.danger:hover {
    background: rgba(220, 38, 38, 0.15);
    color: #b91c1c;
  }

  html.light .divider {
    background: rgba(0, 0, 0, 0.08);
  }

  .context-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
  }
</style>

