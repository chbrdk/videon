<script>
  import { goto } from '$app/navigation';

  export let folder;
  export let selected = false;
  export let onSelect = () => {};
  export let onContextMenu = () => {};
  export let className = '';

  function handleClick() {
    goto(`/videos?folder=${folder.id}`);
  }

  function handleContextMenu(e) {
    e.preventDefault();
    onContextMenu(e, folder);
  }
</script>

<div 
  class="folder-card glass-card {className}"
  class:selected
  draggable="true"
  on:click={handleClick}
  on:contextmenu={handleContextMenu}
  role="button"
  tabindex="0"
>
  <div class="folder-icon">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
    </svg>
  </div>
  
  <div class="folder-content">
    <h3 class="folder-name">{folder.name}</h3>
    <div class="folder-meta">
      {folder.videoCount} {folder.videoCount === 1 ? 'Video' : 'Videos'}
    </div>
  </div>

  <div class="selection-indicator">
    {#if selected}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
      </svg>
    {/if}
  </div>
</div>

<style>
  .folder-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 140px;
    user-select: none;
  }

  .folder-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .folder-card:focus {
    outline: 2px solid rgba(255, 255, 255, 0.3);
    outline-offset: 2px;
  }

  .folder-card.selected {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }

  .folder-icon {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 12px;
    transition: color 0.2s ease;
  }

  .folder-card:hover .folder-icon {
    color: rgba(255, 255, 255, 0.9);
  }

  .folder-content {
    text-align: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .folder-name {
    font-size: 16px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 8px 0;
    word-break: break-word;
  }

  .folder-meta {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
  }

  .selection-indicator {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 24px;
    height: 24px;
    background: rgba(76, 175, 80, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    opacity: 0;
    transform: scale(0);
    transition: all 0.2s ease;
  }

  .folder-card.selected .selection-indicator {
    opacity: 1;
    transform: scale(1);
  }

  /* Drag and drop styles */
  .folder-card[draggable="true"]:hover {
    cursor: grab;
  }

  .folder-card[draggable="true"]:active {
    cursor: grabbing;
  }
</style>
