<script lang="ts">
  import { viewMode, safeViewMode } from '$lib/stores/folders.store';
  import { MaterialSymbol } from '$lib/components/ui';

  export let className = '';
</script>

<div class="glass-button-group {className}">
  <button
    class="glass-button rounded-full {$safeViewMode === 'grid' ? 'active' : ''}"
    on:click={() => viewMode.set('grid')}
    title="Grid View"
  >
    <MaterialSymbol icon="grid_view" fontSize={20} />
  </button>
  <button
    class="glass-button rounded-full {$safeViewMode === 'list' ? 'active' : ''}"
    on:click={() => viewMode.set('list')}
    title="List View"
  >
    <MaterialSymbol icon="view_list" fontSize={20} />
  </button>
</div>

<style>
  .glass-button-group {
    display: flex;
    gap: var(--msqdx-spacing-xs);
    background: var(--msqdx-color-dark-paper);
    backdrop-filter: blur(var(--msqdx-glass-blur));
    border: 1px solid var(--msqdx-color-dark-border);
    border-radius: var(--msqdx-radius-full);
    padding: var(--msqdx-spacing-xxs);
  }

  /* Default (Dark Mode) */
  .glass-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    border-radius: var(--msqdx-radius-full) !important;
    color: #ffffff; /* Explicit White for Dark Mode */
    opacity: 0.5; /* Dimmed when not active */
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
  }

  .glass-button:hover {
    background: rgba(255, 255, 255, 0.1);
    opacity: 0.8;
  }

  .glass-button.active {
    background: rgba(255, 255, 255, 0.2);
    opacity: 1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .glass-button:focus {
    outline: 2px solid var(--msqdx-color-brand-orange);
    outline-offset: 2px;
  }

  /* Light Mode Overrides */
  :global(html.light) .glass-button-group {
    background: var(--msqdx-color-light-paper);
    border: 1px solid var(--msqdx-color-light-border);
  }

  :global(html.light) .glass-button {
    color: #000000; /* Explicit Black for Light Mode */
    opacity: 0.5;
  }

  :global(html.light) .glass-button:hover {
    background: rgba(0, 0, 0, 0.05);
    opacity: 0.8;
  }

  :global(html.light) .glass-button.active {
    background: rgba(0, 0, 0, 0.1);
    opacity: 1;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  }
</style>
