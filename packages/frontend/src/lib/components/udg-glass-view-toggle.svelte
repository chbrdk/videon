<script>
  import { viewMode } from '$lib/stores/folders.store';

  export let className = '';
</script>

<div class="glass-button-group {className}">
  <button 
    class="glass-button rounded-full {$viewMode === 'grid' ? 'active' : ''}"
    on:click={() => viewMode.set('grid')}
    title="Grid View"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3,11H11V3H3M3,21H11V13H3M13,21H21V13H13M13,3V11H21V3"/>
    </svg>
  </button>
  <button 
    class="glass-button rounded-full {$viewMode === 'list' ? 'active' : ''}"
    on:click={() => viewMode.set('list')}
    title="List View"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9,5V9H21V5M9,19H21V15H9M9,14H21V10H9M4,9A2,2 0 0,1 2,7A2,2 0 0,1 4,5A2,2 0 0,1 6,7A2,2 0 0,1 4,9M4,19A2,2 0 0,1 2,17A2,2 0 0,1 4,15A2,2 0 0,1 6,17A2,2 0 0,1 4,19M4,14A2,2 0 0,1 2,12A2,2 0 0,1 4,10A2,2 0 0,1 6,12A2,2 0 0,1 4,14Z"/>
    </svg>
  </button>
</div>

<style>
  .glass-button-group {
    display: flex;
    gap: 8px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 32px;
    padding: 4px;
  }
.rounded{
  border-radius: 28px !important;
}
  .glass-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    border-radius: 28px !important;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .glass-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .glass-button.active {
    background: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .glass-button:focus {
    outline: 2px solid rgba(255, 255, 255, 0.3);
    outline-offset: 2px;
  }

  :global(html.light) .glass-button {
    color: rgba(17, 24, 39, 0.65);
  }

  :global(html.light) .glass-button:hover {
    background: rgba(17, 24, 39, 0.08);
    color: rgba(17, 24, 39, 0.85);
  }

  :global(html.light) .glass-button.active {
    background: rgba(17, 24, 39, 0.12);
    color: rgba(17, 24, 39, 1);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  }

  :global(html.light) .glass-button:focus {
    outline: 2px solid rgba(17, 24, 39, 0.2);
    outline-offset: 2px;
  }
</style>
