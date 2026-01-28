<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import PlayArrowIcon from '@material-icons/svg/svg/play_arrow/baseline.svg?raw';
  import PauseIcon from '@material-icons/svg/svg/pause/baseline.svg?raw';
  import SkipPreviousIcon from '@material-icons/svg/svg/skip_previous/baseline.svg?raw';
  import SkipNextIcon from '@material-icons/svg/svg/skip_next/baseline.svg?raw';
  import VolumeUpIcon from '@material-icons/svg/svg/volume_up/baseline.svg?raw';
  import VolumeOffIcon from '@material-icons/svg/svg/volume_off/baseline.svg?raw';
  import UndoIcon from '@material-icons/svg/svg/undo/baseline.svg?raw';
  import RedoIcon from '@material-icons/svg/svg/redo/baseline.svg?raw';
  import ContentCutIcon from '@material-icons/svg/svg/content_cut/baseline.svg?raw';
  import AddIcon from '@material-icons/svg/svg/add/baseline.svg?raw';
  import SearchIcon from '@material-icons/svg/svg/search/baseline.svg?raw';
  import CloseIcon from '@material-icons/svg/svg/close/baseline.svg?raw';
  import { _, currentLocale } from '$lib/i18n';

  const dispatch = createEventDispatcher();

  export let isPlaying = false;
  export let currentTime = 0;
  export let duration = 0;
  export let videoMuted = false;
  export let videoAudioLevel = 100;
  export let canGoBack = false;
  export let canGoForward = false;
  export let canUndo = false;
  export let canRedo = false;
  export let canSplit = false;
  export let canAddScene = true;
  export let showSearchModal = false;
  export let searchQuery = '';
  export let searchResults: any[] = [];
  export let searching = false;

  function handlePlayPause() {
    dispatch('playPause');
  }

  function handlePrevious() {
    dispatch('previous');
  }

  function handleNext() {
    dispatch('next');
  }

  function handleMuteToggle() {
    dispatch('muteToggle');
  }

  function handleVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const level = parseInt(target.value);
    dispatch('volumeChange', { level });
  }

  function handleUndo() {
    dispatch('undo');
  }

  function handleRedo() {
    dispatch('redo');
  }

  function handleSplit() {
    dispatch('split');
  }

  function handleAddScene() {
    dispatch('addScene');
  }

  function handleSearch() {
    dispatch('search');
  }

  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    dispatch('searchInput', { value: target.value });
  }

  function handleAddSceneToProject(result: { sceneId: string; videoId: string; startTime: number; endTime: number }) {
    console.log('Central Controls: Adding scene to project:', result);
    dispatch('addSceneToProject', result);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="central-controls glass-effect">
  <!-- Previous Button -->
  <button 
    class="control-btn"
    on:click={handlePrevious}
    disabled={!canGoBack}
    title={_('controls.previousScene')}
  >
    <div class="icon-24px">{@html SkipPreviousIcon}</div>
  </button>

  <!-- Play/Pause Button -->
  <button 
    class="control-btn play-pause-btn"
    on:click={handlePlayPause}
    title={isPlaying ? _('controls.pause') : _('controls.play')}
  >
    <div class="icon-32px">{@html (isPlaying ? PauseIcon : PlayArrowIcon)}</div>
  </button>

  <!-- Next Button -->
  <button 
    class="control-btn"
    on:click={handleNext}
    disabled={!canGoForward}
    title={_('controls.nextScene')}
  >
    <div class="icon-24px">{@html SkipNextIcon}</div>
  </button>

  <!-- Divider -->
  <div class="control-divider"></div>

  <!-- Time Display -->
  <div class="time-display">
    <span class="current-time">{formatTime(currentTime)}</span>
    <span class="time-separator">/</span>
    <span class="total-time">{formatTime(duration)}</span>
  </div>

  <!-- Divider -->
  <div class="control-divider"></div>

  <!-- Editing Tools -->
  <button 
    class="control-btn"
    on:click={handleUndo}
    disabled={!canUndo}
    title={_('controls.undo')}
  >
    <div class="icon-20px">{@html UndoIcon}</div>
  </button>

  <button 
    class="control-btn"
    on:click={handleRedo}
    disabled={!canRedo}
    title={_('controls.redo')}
  >
    <div class="icon-20px">{@html RedoIcon}</div>
  </button>

  <button 
    class="control-btn"
    on:click={handleSplit}
    disabled={!canSplit}
    title={_('controls.split')}
  >
    <div class="icon-20px">{@html ContentCutIcon}</div>
  </button>

  <!-- Divider -->
  <div class="control-divider"></div>

  <!-- Volume Controls -->
  <div class="volume-controls">
    <button 
      class="control-btn volume-btn"
      on:click={handleMuteToggle}
      title={videoMuted ? _('controls.unmute') : _('controls.mute')}
    >
      <div class="icon-20px">{@html (videoMuted ? VolumeOffIcon : VolumeUpIcon)}</div>
    </button>
    
    <input 
      type="range" 
      min="0" 
      max="100" 
      bind:value={videoAudioLevel}
      on:input={handleVolumeChange}
      class="volume-slider"
      title={`${_('controls.volume')}: ${videoAudioLevel}%`}
    />
    
    <span class="volume-percentage">{videoAudioLevel}%</span>
  </div>
  
  <!-- Add Scene Button - Absolutely positioned right -->
  <button 
    class="control-btn add-scene-btn"
    on:click={handleAddScene}
    disabled={!canAddScene}
    title={_('controls.addScene')}
  >
    <div class="icon-20px">{@html AddIcon}</div>
  </button>
  
  <!-- Search Modal - Positioned relative to Add Scene Button -->
  {#if showSearchModal}
    <div class="search-modal-overlay" on:click={() => dispatch('closeSearchModal')}>
      <div class="search-modal" on:click|stopPropagation>
      <div class="search-modal-header">
        <h3 class="text-lg font-bold">
          {_('search.searchScenes')}
        </h3>
        <button class="close-btn" on:click={() => dispatch('closeSearchModal')}>
          <div class="icon-20px">{@html CloseIcon}</div>
        </button>
      </div>
      
      <!-- Search Input -->
      <div class="search-input-container">
        <input
          type="text"
          bind:value={searchQuery}
          on:keydown={(e) => e.key === 'Enter' && handleSearch()}
          on:input={handleSearchInput}
          placeholder={_('search.searchPlaceholder')}
          class="search-input"
        />
        <button class="search-btn" on:click={handleSearch} disabled={searching}>
          <div class="icon-20px">{@html SearchIcon}</div>
        </button>
      </div>
      
      <!-- Results -->
      <div class="search-results">
        {#each searchResults as result}
          <div class="search-result-item">
            <div class="result-content">
              <div class="result-title">{result.videoTitle}</div>
              <div class="result-description">
                {result.content}
              </div>
            </div>
            <button 
              class="add-btn"
              on:click={() => handleAddSceneToProject(result)}
            >
              {_('search.addToProject')}
            </button>
          </div>
        {/each}
      </div>
      </div>
    </div>
  {/if}
</div>

<style lang="postcss">
  .central-controls {
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-md);
    padding: var(--msqdx-spacing-md) var(--msqdx-spacing-lg);
    background: var(--msqdx-color-dark-paper);
    backdrop-filter: blur(var(--msqdx-glass-blur));
    border: 1px solid var(--msqdx-color-dark-border);
    position: relative;
    margin-top: 0 !important;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid var(--msqdx-color-dark-border);
    color: var(--msqdx-color-dark-text-primary);
    border-radius: var(--msqdx-radius-full);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
    padding: var(--msqdx-spacing-sm);
  }

  .control-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: var(--msqdx-color-brand-orange);
    transform: scale(1.05);
  }

  .control-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  .play-pause-btn {
    width: 3rem;
    height: 3rem;
    background: var(--msqdx-color-tint-blue);
    border-color: var(--msqdx-color-brand-blue);
  }

  .play-pause-btn:hover:not(:disabled) {
    background: var(--msqdx-color-tint-blue);
    border-color: var(--msqdx-color-brand-blue);
  }

  .control-divider {
    width: 1px;
    height: 2rem;
    background: var(--msqdx-color-dark-border);
  }

  .time-display {
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-xxs);
    font-family: var(--msqdx-font-mono);
    font-size: var(--msqdx-font-size-body1);
    font-weight: var(--msqdx-font-weight-semibold);
    color: var(--msqdx-color-dark-text-primary);
    min-width: 6rem;
  }

  .current-time {
    color: var(--msqdx-color-brand-blue);
  }

  .time-separator {
    opacity: 0.6;
  }

  .total-time {
    opacity: 0.8;
  }

  .volume-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .volume-btn {
    width: 2rem;
    height: 2rem;
  }

  .volume-slider {
    width: 80px;
    height: 4px;
    background: var(--msqdx-color-dark-border);
    border-radius: var(--msqdx-radius-xs);
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: var(--msqdx-color-brand-blue);
    border-radius: var(--msqdx-radius-full);
    cursor: pointer;
    border: 2px solid var(--msqdx-color-brand-white);
  }

  .volume-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: var(--msqdx-color-brand-blue);
    border-radius: var(--msqdx-radius-full);
    cursor: pointer;
    border: 2px solid var(--msqdx-color-brand-white);
  }

  .volume-percentage {
    font-size: var(--msqdx-font-size-xs);
    font-family: var(--msqdx-font-primary);
    color: var(--msqdx-color-dark-text-primary);
    opacity: 0.8;
    min-width: 2.5rem;
    text-align: center;
  }

  .add-scene-btn {
    position: absolute;
    right: var(--msqdx-spacing-md);
    top: 50%;
    transform: translateY(-50%);
    background: var(--msqdx-color-tint-green) !important;
    border-color: var(--msqdx-color-brand-orange) !important;
    width: 2.5rem;
    height: 2.5rem;
  }

  .add-scene-btn:hover:not(:disabled) {
    background: var(--msqdx-color-tint-green) !important;
    border-color: var(--msqdx-color-brand-orange) !important;
    transform: translateY(-50%) !important;
    transition: none !important;
  }

  .search-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 1000;
  }

  .search-modal {
    position: fixed;
    top: 50%;
    right: 2rem;
    transform: translateY(-50%);
    background: var(--msqdx-color-dark-paper);
    backdrop-filter: blur(var(--msqdx-glass-blur));
    -webkit-backdrop-filter: blur(var(--msqdx-glass-blur));
    border: 1px solid var(--msqdx-color-dark-border);
    border-radius: var(--msqdx-radius-lg);
    padding: var(--msqdx-spacing-lg);
    width: min(400px, 90vw);
    max-height: 60vh;
    overflow-y: auto;
    z-index: 1000;
  }
  
  @media (max-width: 768px) {
    .search-modal {
      right: 1rem;
      left: 1rem;
      top: 2rem;
      transform: none;
      width: auto;
      max-height: 70vh;
      padding: 1rem;
    }
  }
  
  @media (max-width: 640px) {
    .search-modal {
      position: fixed;
      top: 0;
      right: 0;
      left: 0;
      bottom: 0;
      width: 100%;
      max-width: none;
      max-height: none;
      transform: none;
      border-radius: 0;
      padding: 1rem;
    }
  }

  .search-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0.5rem;
    width: 2rem;
    height: 2rem;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .search-input-container {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .search-input {
    flex: 1;
    padding: var(--msqdx-spacing-sm) var(--msqdx-spacing-md);
    background: var(--msqdx-color-dark-paper);
    border: 1px solid var(--msqdx-color-dark-border);
    border-radius: var(--msqdx-radius-lg);
    color: var(--msqdx-color-dark-text-primary);
    font-size: var(--msqdx-font-size-body1);
    font-family: var(--msqdx-font-primary);
  }

  .search-input::placeholder {
    color: var(--msqdx-color-dark-text-secondary);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--msqdx-color-brand-blue);
    background: var(--msqdx-color-dark-paper);
  }

  .search-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--msqdx-color-tint-blue);
    border: 1px solid var(--msqdx-color-brand-blue);
    color: var(--msqdx-color-dark-text-primary);
    border-radius: var(--msqdx-radius-lg);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
    padding: var(--msqdx-spacing-sm);
    width: 3rem;
  }

  .search-btn:hover:not(:disabled) {
    background: var(--msqdx-color-tint-blue);
    border-color: var(--msqdx-color-brand-blue);
  }

  .search-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .search-results {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .search-result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .result-content {
    flex: 1;
  }

  .result-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: white;
    margin-bottom: 0.25rem;
  }

  .result-description {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .add-btn {
    background: var(--msqdx-color-tint-green);
    border: 1px solid var(--msqdx-color-brand-orange);
    color: var(--msqdx-color-dark-text-primary);
    border-radius: var(--msqdx-radius-md);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
    padding: var(--msqdx-spacing-sm) var(--msqdx-spacing-md);
    font-size: var(--msqdx-font-size-xs);
    font-weight: var(--msqdx-font-weight-semibold);
    font-family: var(--msqdx-font-primary);
    margin-left: var(--msqdx-spacing-sm);
  }

  .add-btn:hover {
    background: var(--msqdx-color-tint-green);
    border-color: var(--msqdx-color-brand-orange);
  }

  /* Light theme styles */
  html.light .search-modal {
    background: rgba(255, 255, 255, 0.85);
    border-color: rgba(0, 0, 0, 0.2);
  }

  html.light .close-btn {
    background: rgba(0, 0, 0, 0.1);
    border-color: rgba(0, 0, 0, 0.2);
    color: black;
  }

  html.light .close-btn:hover {
    background: rgba(0, 0, 0, 0.15);
    border-color: rgba(0, 0, 0, 0.3);
  }

  html.light .search-input {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.2);
    color: black;
  }

  html.light .search-input::placeholder {
    color: rgba(0, 0, 0, 0.6);
  }

  html.light .search-input:focus {
    border-color: rgba(0, 122, 255, 0.6);
    background: rgba(0, 0, 0, 0.1);
  }

  html.light .search-result-item {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.15);
  }

  html.light .result-title {
    color: black;
  }

  html.light .result-description {
    color: rgba(0, 0, 0, 0.7);
  }

  .icon-20px {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-24px {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-32px {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Light theme styles */
  :global(html.light) .central-controls {
    background: var(--msqdx-color-light-paper);
    border-color: var(--msqdx-color-light-border);
  }

  :global(html.light) .control-btn {
    background: rgba(0, 0, 0, 0.05);
    border-color: var(--msqdx-color-light-border);
    color: var(--msqdx-color-light-text-primary);
  }

  :global(html.light) .control-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.1);
    border-color: var(--msqdx-color-brand-orange);
  }

  :global(html.light) .play-pause-btn {
    background: var(--msqdx-color-tint-blue);
    border-color: var(--msqdx-color-brand-blue);
  }

  :global(html.light) .play-pause-btn:hover:not(:disabled) {
    background: var(--msqdx-color-tint-blue);
    border-color: var(--msqdx-color-brand-blue);
  }

  :global(html.light) .control-divider {
    background: var(--msqdx-color-light-border);
  }

  :global(html.light) .time-display {
    color: var(--msqdx-color-light-text-primary);
  }

  :global(html.light) .current-time {
    color: var(--msqdx-color-brand-blue);
  }

  :global(html.light) .volume-slider {
    background: var(--msqdx-color-light-border);
  }

  :global(html.light) .volume-slider::-webkit-slider-thumb {
    border-color: var(--msqdx-color-brand-white);
  }

  :global(html.light) .volume-slider::-moz-range-thumb {
    border-color: var(--msqdx-color-brand-white);
  }

  :global(html.light) .volume-percentage {
    color: var(--msqdx-color-light-text-primary);
  }

  :global(html.light) .add-scene-btn {
    background: var(--msqdx-color-tint-green) !important;
    border-color: var(--msqdx-color-brand-orange) !important;
  }

  :global(html.light) .add-scene-btn:hover:not(:disabled) {
    background: var(--msqdx-color-tint-green) !important;
    border-color: var(--msqdx-color-brand-orange) !important;
  }
  
  @media (max-width: 1024px) {
    .central-controls {
      gap: 0.5rem;
      padding: 0.75rem 1rem;
    }
  }
  
  @media (max-width: 768px) {
    .central-controls {
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .time-display {
      width: 100%;
      text-align: center;
      font-size: 0.75rem;
      order: -1;
    }
    
    .control-btn {
      width: 2.5rem;
      height: 2.5rem;
      min-width: 44px;
      min-height: 44px;
    }
  }
  
  @media (max-width: 640px) {
    .central-controls {
      padding: 0.5rem;
    }
    
    .volume-controls {
      width: 100%;
      justify-content: center;
      order: 2;
    }
    
    .control-divider {
      display: none;
    }
  }
</style>
