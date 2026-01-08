<script lang="ts">
  import { canUndo, canRedo, undo, redo } from '$lib/stores/edit-history.store';
  import { createEventDispatcher } from 'svelte';
  
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
      <div class="icon-20px">↩️</div>
      <span>Undo</span>
    </button>
    
    <button 
      class="toolbar-btn" 
      on:click={handleRedo}
      disabled={!$canRedo}
      title="Wiederholen (Cmd+Shift+Z)"
    >
      <div class="icon-20px">↪️</div>
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
      <div class="icon-20px">✂️</div>
      <span>Split</span>
    </button>
  </div>
</div>

<style>
  .editing-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    margin-bottom: 1rem;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .toolbar-section {
    display: flex;
    gap: 0.25rem;
  }
  
  .toolbar-divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.2);
  }
  
  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 0.5rem;
    color: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
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
    font-size: 0.875rem;
    font-weight: 500;
  }
</style>
