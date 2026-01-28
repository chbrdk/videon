<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { 
    timelineClips, 
    selectedClip, 
    currentTime, 
    duration, 
    zoomLevel,
    initializeClips,
    selectClip,
    updateCurrentTime,
    setPlaying,
    deleteClip,
    splitClip,
    mergeClips,
    type TimelineClip,
    type SceneData
  } from '$lib/stores/timeline.store';
  import { api } from '$lib/config/environment';
  import EditIcon from '@material-icons/svg/svg/edit/baseline.svg?raw';
  import DeleteIcon from '@material-icons/svg/svg/delete/baseline.svg?raw';
  import SplitIcon from '@material-icons/svg/svg/content_cut/baseline.svg?raw';
  import MergeIcon from '@material-icons/svg/svg/merge/baseline.svg?raw';
  import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw';

  const dispatch = createEventDispatcher();

  export let scenes: SceneData[] = [];
  export let videoElement: HTMLVideoElement;
  export let videoDuration: number = 0;
  export let videoId: string = '';

  let timelineWidth = 1000;

  let timelineContainer: HTMLDivElement;
  let waveformContainer: HTMLDivElement;
  let wavesurfer: any = null;
  let regions: any = null;
  let isInitialized = false;
  let hoveredClip: string | null = null;
  let splitModalOpen = false;
  let splitClipId: string | null = null;
  let splitTime = 0;

  // Initialize timeline when scenes change
  $: if (scenes && scenes.length > 0 && !isInitialized) {
    initializeTimeline();
  }

  onMount(() => {
    if (scenes && scenes.length > 0) {
      initializeTimeline();
    }
  });

  onDestroy(() => {
    if (wavesurfer) {
      wavesurfer.destroy();
    }
  });

  async function initializeTimeline() {
    try {
      // Initialize clips in store
      initializeClips(scenes);
      
      // Set up video synchronization
      if (videoElement) {
        videoElement.addEventListener('timeupdate', handleVideoTimeUpdate);
        videoElement.addEventListener('play', () => setPlaying(true));
        videoElement.addEventListener('pause', () => setPlaying(false));
      }
      
      // Set initial zoom level based on video duration
      if (videoDuration > 120) {
        zoomLevel.set(0.8); // Zoom out for very long videos
      } else if (videoDuration > 60) {
        zoomLevel.set(1.2); // Medium zoom for longer videos
      } else {
        zoomLevel.set(1.5); // Zoom in for shorter videos
      }
      
      isInitialized = true;
      console.log('✅ Timeline initialized with', scenes.length, 'scenes');
      console.log('🎬 Video ID:', videoId);
      console.log('📹 First scene ID:', scenes[0]?.sceneId);
    } catch (error) {
      console.error('Failed to initialize timeline:', error);
    }
  }


  function handleVideoTimeUpdate() {
    if (videoElement) {
      updateCurrentTime(videoElement.currentTime);
      // Update timeline playhead position
      updatePlayheadPosition(videoElement.currentTime);
    }
  }

  function updatePlayheadPosition(time: number) {
    // Update visual playhead position
    const timelineWidth = timelineContainer?.clientWidth || 1000;
    const timeRatio = time / videoDuration;
    const playheadPosition = timeRatio * timelineWidth;
    
    // Update playhead element position
    const playhead = timelineContainer?.querySelector('.playhead') as HTMLElement;
    if (playhead) {
      playhead.style.left = `${playheadPosition}px`;
    }
  }

  function handleClipClick(clip: TimelineClip) {
    selectClip(clip.id);
    if (videoElement) {
      videoElement.currentTime = clip.startTime;
      dispatch('seekTo', { time: clip.startTime });
    }
  }

  function handleClipHover(clipId: string | null) {
    hoveredClip = clipId;
  }

  function handleSplitClip(clipId: string) {
    splitClipId = clipId;
    const clip = $timelineClips.find(c => c.id === clipId);
    if (clip) {
      splitTime = clip.startTime + (clip.duration / 2);
    }
    splitModalOpen = true;
  }

  function confirmSplit() {
    if (splitClipId && splitTime > 0) {
      splitClip(splitClipId, splitTime);
      splitModalOpen = false;
      splitClipId = null;
      splitTime = 0;
    }
  }

  function handleDeleteClip(clipId: string) {
    if (confirm('Are you sure you want to delete this clip?')) {
      deleteClip(clipId);
    }
  }

  function handleMergeClips(clipId1: string, clipId2: string) {
    mergeClips(clipId1, clipId2);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getClipWidth(clip: TimelineClip): string {
    const timelineWidth = timelineContainer?.clientWidth || 1000;
    const clipWidth = (clip.duration / videoDuration) * timelineWidth;
    return `${Math.max(60, clipWidth)}px`;
  }

  function getClipLeft(clip: TimelineClip): string {
    const timelineWidth = timelineContainer?.clientWidth || 1000;
    const left = (clip.startTime / videoDuration) * timelineWidth;
    return `${left}px`;
  }
</script>

<div class="timeline-container" bind:this={timelineContainer}>
  <!-- Timeline Header -->
  <div class="timeline-header">
    <h3 class="text-lg font-semibold text-white mb-2">Timeline Editor</h3>
    <div class="timeline-controls">
      <button 
        class="control-btn" 
        on:click={() => dispatch('export')}
        title="Export Timeline"
      >
        Export
      </button>
    </div>
  </div>

  <!-- Timeline Track -->
  <div class="timeline-track" bind:this={waveformContainer}>
    <!-- Time Ruler -->
    <div class="time-ruler">
      {#each Array.from({length: Math.ceil(videoDuration / 10)}) as _, i}
        <div 
          class="time-marker" 
          style="left: {(i * 10 / videoDuration) * 100}%"
        >
          {formatTime(i * 10)}
        </div>
      {/each}
      {#if videoDuration > 0}
        <div 
          class="time-marker" 
          style="left: 100%"
        >
          {formatTime(videoDuration)}
        </div>
      {/if}
    </div>

    <!-- Playhead -->
    <div 
      class="playhead" 
      style="left: {($currentTime / videoDuration) * 100}%"
    ></div>

    <!-- Clips Container with Horizontal Scroll -->
    <div class="clips-container" style="overflow-x: auto; overflow-y: hidden;">
      <div class="clips-track" style="width: {Math.max(1000, videoDuration * $zoomLevel * 20)}px;">
        {#each $timelineClips as clip (clip.id)}
          <div
            class="clip-region"
            class:selected={$selectedClip === clip.id}
            class:hovered={hoveredClip === clip.id}
            style="
              width: {Math.max(40, Math.max(60, clip.duration * $zoomLevel * 20))}px;
              background: {clip.color || 'rgba(255, 255, 255, 0.2)'};
            "
            on:click={() => handleClipClick(clip)}
            on:mouseenter={() => handleClipHover(clip.id)}
            on:mouseleave={() => handleClipHover(null)}
            role="button"
            tabindex="0"
          >
          <!-- Clip Content -->
          <div class="clip-content">
            <div class="thumbnail-container">
              <img 
                src={`${api.baseUrl}/videos/${videoId}/scenes/${clip.sceneId}/thumbnail`}
                alt="Scene thumbnail" 
                class="clip-thumbnail"
                loading="lazy"
                on:loadstart={() => console.log('🖼️ Loading thumbnail for scene:', clip.sceneId)}
                on:load={(e) => {
                  // Hide loading indicator when image loads
                  const container = e.target.parentElement;
                  const loading = container.querySelector('.thumbnail-loading');
                  if (loading) loading.style.display = 'none';
                }}
                on:error={(e) => {
                  console.error('❌ Thumbnail failed to load for scene:', clip.sceneId, 'URL:', e.target.src);
                  // Fallback to placeholder if thumbnail fails to load
                  e.target.style.display = 'none';
                  const container = e.target.parentElement;
                  const loading = container.querySelector('.thumbnail-loading');
                  const placeholder = container.querySelector('.clip-placeholder');
                  if (loading) loading.style.display = 'none';
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
              <div class="thumbnail-loading">
                <div class="loading-spinner"></div>
              </div>
              <div class="clip-placeholder" style="display: none;">
                Scene {clip.order + 1}
              </div>
            </div>
            
            <div class="clip-info">
              <span class="clip-duration">{formatTime(clip.duration)}</span>
              <span class="clip-time">{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</span>
              <span class="clip-number">#{clip.order + 1}</span>
            </div>
          </div>

          <!-- Clip Controls -->
          {#if hoveredClip === clip.id || $selectedClip === clip.id}
            <div class="clip-controls">
              <button 
                class="control-btn small"
                on:click|stopPropagation={() => handleSplitClip(clip.id)}
                title="Split Clip"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
              </button>
              
              <button 
                class="control-btn small"
                on:click|stopPropagation={() => handleDeleteClip(clip.id)}
                title="Delete Clip"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"/>
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Timeline Footer -->
  <div class="timeline-footer">
    <div class="time-display">
      Current: {formatTime($currentTime)} / {formatTime(videoDuration)}
    </div>
    <div class="zoom-controls">
      <button class="control-btn small" on:click={() => zoomLevel.update(z => Math.max(0.5, z - 0.2))}>-</button>
      <span class="zoom-level">{Math.round($zoomLevel * 100)}%</span>
      <button class="control-btn small" on:click={() => zoomLevel.update(z => Math.min(3, z + 0.2))}>+</button>
    </div>
  </div>
</div>

<!-- Split Modal -->
{#if splitModalOpen}
  <div class="modal-overlay" on:click={() => splitModalOpen = false}>
    <div class="modal" on:click|stopPropagation>
      <h3>Split Clip</h3>
      <p>Select the time to split this clip:</p>
      <div class="split-controls">
        <input 
          type="range" 
          bind:value={splitTime} 
          min={$timelineClips.find(c => c.id === splitClipId)?.startTime || 0}
          max={$timelineClips.find(c => c.id === splitClipId)?.endTime || videoDuration}
          step="0.1"
        />
        <span class="split-time">{formatTime(splitTime)}</span>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" on:click={() => splitModalOpen = false}>Cancel</button>
        <button class="btn-primary" on:click={confirmSplit}>Split</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .timeline-container {
    backdrop-filter: blur(20px);
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    margin: 1rem 0;
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .timeline-track {
    position: relative;
    height: 120px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .time-ruler {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
  }

  .time-marker {
    position: absolute;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
    transform: translateX(-50%);
  }

  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #ff6b6b;
    z-index: 10;
    pointer-events: none;
  }

  .clips-container {
    position: relative;
    top: 20px;
    height: 100px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  }

  .clips-container::-webkit-scrollbar {
    height: 8px;
  }

  .clips-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .clips-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }

  .clips-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  .clips-track {
    height: 100px;
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .clip-region {
    position: relative;
    height: 80px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
    flex-shrink: 0;
  }

  .clip-region:hover,
  .clip-region.hovered {
    border-color: rgba(255, 255, 255, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .clip-region.selected {
    border-color: #ff6b6b;
    box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.3);
  }

  .clip-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .thumbnail-container {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .thumbnail-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .clip-thumbnail {
    flex: 1;
    width: 100%;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.2);
  }

  .clip-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .clip-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 4px;
    font-size: 0.6rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .clip-number {
    background: rgba(255, 255, 255, 0.2);
    padding: 1px 4px;
    border-radius: 2px;
    font-weight: 500;
  }

  .clip-controls {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 2px;
  }

  .control-btn {
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: white;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .control-btn.small {
    padding: 2px 4px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .timeline-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .zoom-level {
    min-width: 40px;
    text-align: center;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 2rem;
    min-width: 400px;
    backdrop-filter: blur(20px);
  }

  .modal h3 {
    color: white;
    margin-bottom: 1rem;
  }

  .modal p {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 1rem;
  }

  .split-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .split-controls input[type="range"] {
    flex: 1;
  }

  .split-time {
    color: white;
    font-weight: 500;
    min-width: 60px;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .btn-primary {
    background: #ff6b6b;
    border: none;
    border-radius: 6px;
    color: white;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: white;
    padding: 0.5rem 1rem;
    cursor: pointer;
  }

  .btn-primary:hover {
    background: #ff5252;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
  }
</style>
