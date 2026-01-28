<script lang="ts">
  import { canUndo, canRedo, undo, redo } from '$lib/stores/edit-history.store';
  import { createEventDispatcher } from 'svelte';
  import { MaterialSymbol } from '$lib/components/ui';

  const dispatch = createEventDispatcher();

  export let canSplit: boolean = false;

  async function handleUndo() {
    try {
      await undo();
      dispatch('undo');
    } catch (error) {
      console.error('Undo failed:', error);
    }
  }

  async function handleRedo() {
    try {
      await redo();
      dispatch('redo');
    } catch (error) {
      console.error('Redo failed:', error);
    }
  }

  function handleSplit() {
    dispatch('split');
  }
</script>

<div class="editing-toolbar glass-effect">
  <!-- Undo/Redo -->
  <div class="toolbar-section">
    <button
      class="toolbar-btn"
      on:click={handleUndo}
      disabled={!$canUndo}
      title="Rückgängig (Cmd+Z)"
    >
      <div class="icon-20px"><MaterialSymbol icon="undo" fontSize={20} /></div>
      <span>Undo</span>
    </button>

    <button
      class="toolbar-btn"
      on:click={handleRedo}
      disabled={!$canRedo}
      title="Wiederholen (Cmd+Shift+Z)"
    >
      <div class="icon-20px"><MaterialSymbol icon="redo" fontSize={20} /></div>
      <span>Redo</span>
    </button>
  </div>

  <div class="toolbar-divider"></div>

  <!-- Split Tool -->
  <div class="toolbar-section">
    <button
      class="toolbar-btn"
      on:click={handleSplit}
      disabled={!canSplit}
      title="Szene an Playhead teilen (S)"
    >
      <div class="icon-20px"><MaterialSymbol icon="content_cut" fontSize={20} /></div>
      <span>Split</span>
    </button>
  </div>
</div>

<style>
  .editing-toolbar {
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-sm);
    padding: var(--msqdx-spacing-sm) var(--msqdx-spacing-md);
    border-radius: var(--msqdx-radius-lg);
    margin-bottom: var(--msqdx-spacing-md);
    background: var(--msqdx-color-dark-paper);
    backdrop-filter: blur(var(--msqdx-glass-blur));
    border: 1px solid var(--msqdx-color-dark-border);
  }

  .toolbar-section {
    display: flex;
    gap: var(--msqdx-spacing-xxs);
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background: var(--msqdx-color-dark-border);
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-sm);
    padding: var(--msqdx-spacing-sm) var(--msqdx-spacing-sm);
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: var(--msqdx-radius-md);
    color: var(--msqdx-color-dark-text-primary);
    font-size: var(--msqdx-font-size-body1);
    font-family: var(--msqdx-font-primary);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
    font-weight: var(--msqdx-font-weight-medium);
  }

  .toolbar-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .toolbar-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  .toolbar-btn:active:not(:disabled) {
    transform: translateY(0);
    background: rgba(255, 255, 255, 0.15);
  }

  .icon-20px {
    font-size: 1.25rem;
    line-height: 1;
  }

  .toolbar-btn span {
    font-size: var(--msqdx-font-size-body1);
    font-weight: var(--msqdx-font-weight-medium);
    font-family: var(--msqdx-font-primary);
  }

  :global(html.light) .editing-toolbar {
    background: var(--msqdx-color-light-paper);
    border: 1px solid var(--msqdx-color-light-border);
  }

  :global(html.light) .toolbar-divider {
    background: var(--msqdx-color-light-border);
  }

  :global(html.light) .toolbar-btn {
    background: rgba(0, 0, 0, 0.05);
    color: var(--msqdx-color-light-text-primary);
  }

  :global(html.light) .toolbar-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.1);
  }
</style>
