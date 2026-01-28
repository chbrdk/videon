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
    moveClip,
    updateClip,
    toggleClipLock,
    toggleClipMute,
    type TimelineClip,
    type SceneData,
  } from '$lib/stores/timeline.store';
  import { api } from '$lib/config/environment';
  import { MaterialSymbol } from '$lib/components/ui';

  const dispatch = createEventDispatcher();

  export let scenes: SceneData[] = [];
  export let videoElement: HTMLVideoElement;
  export let videoDuration: number = 0;
  export let videoId: string = '';

  let timelineContainer: HTMLDivElement;
  let waveformContainer: HTMLDivElement;
  let isInitialized = false;
  let hoveredClip: string | null = null;
  let splitModalOpen = false;
  let splitClipId: string | null = null;
  let splitTime = 0;
  let mergeModalOpen = false;
  let mergeClip1: string | null = null;
  let mergeClip2: string | null = null;

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
    // Cleanup if needed
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
      console.log('✅ Enhanced Timeline initialized with', scenes.length, 'scenes');
    } catch (error) {
      console.error('Failed to initialize enhanced timeline:', error);
    }
  }

  function handleVideoTimeUpdate() {
    if (videoElement) {
      updateCurrentTime(videoElement.currentTime);
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
      splitTime = clip.startTime + clip.duration / 2;
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
      dispatch('clipDeleted', { clipId });
    }
  }

  function handleMergeClips(clipId1: string, clipId2: string) {
    mergeModalOpen = true;
    mergeClip1 = clipId1;
    mergeClip2 = clipId2;
  }

  function confirmMerge() {
    if (mergeClip1 && mergeClip2) {
      mergeClips(mergeClip1, mergeClip2);
      mergeModalOpen = false;
      mergeClip1 = null;
      mergeClip2 = null;
    }
  }

  function handleMoveClip(clipId: string, direction: 'left' | 'right') {
    const clips = $timelineClips;
    const currentIndex = clips.findIndex(c => c.id === clipId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < clips.length) {
      moveClip(clipId, newIndex);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getClipWidth(clip: TimelineClip): string {
    const clipWidth = clip.duration * $zoomLevel * 20;
    return `${Math.max(60, clipWidth)}px`;
  }

  function getClipLeft(clip: TimelineClip): string {
    const left = clip.startTime * $zoomLevel * 20;
    return `${left}px`;
  }

  function exportTimeline(format: 'json' | 'edl' | 'csv') {
    const exportUrl = `${api.baseUrl}/videos/${videoId}/timeline/export/${format}`;
    window.open(exportUrl, '_blank');
  }

  function handleZoomIn() {
    zoomLevel.update(z => Math.min(5.0, z + 0.2));
  }

  function handleZoomOut() {
    zoomLevel.update(z => Math.max(0.1, z - 0.2));
  }
</script>

<div class="enhanced-timeline-container" bind:this={timelineContainer}>
  <!-- Timeline Header -->
  <div class="timeline-header">
    <h3 class="text-lg font-semibold text-white mb-2">Enhanced Timeline Editor</h3>
    <div class="timeline-controls">
      <div class="zoom-controls">
        <button class="control-btn" on:click={handleZoomOut} title="Zoom Out">-</button>
        <span class="zoom-level">{Math.round($zoomLevel * 100)}%</span>
        <button class="control-btn" on:click={handleZoomIn} title="Zoom In">+</button>
      </div>
      <div class="export-controls">
        <button class="control-btn" on:click={() => exportTimeline('json')} title="Export JSON"
          >JSON</button
        >
        <button class="control-btn" on:click={() => exportTimeline('edl')} title="Export EDL"
          >EDL</button
        >
        <button class="control-btn" on:click={() => exportTimeline('csv')} title="Export CSV"
          >CSV</button
        >
      </div>
    </div>
  </div>

  <!-- Timeline Track -->
  <div class="timeline-track" bind:this={waveformContainer}>
    <!-- Time Ruler -->
    <div class="time-ruler">
      {#each Array.from({ length: Math.ceil(videoDuration / 10) }) as _, i}
        <div class="time-marker" style="left: {((i * 10) / videoDuration) * 100}%">
          {formatTime(i * 10)}
        </div>
      {/each}
      {#if videoDuration > 0}
        <div class="time-marker" style="left: 100%">
          {formatTime(videoDuration)}
        </div>
      {/if}
    </div>

    <!-- Playhead -->
    <div class="playhead" style="left: {($currentTime / videoDuration) * 100}%"></div>

    <!-- Clips Container with Horizontal Scroll -->
    <div class="clips-container" style="overflow-x: auto; overflow-y: hidden;">
      <div class="clips-track" style="width: {Math.max(1000, videoDuration * $zoomLevel * 20)}px;">
        {#each $timelineClips as clip (clip.id)}
          <div
            class="clip-region"
            class:selected={$selectedClip === clip.id}
            class:hovered={hoveredClip === clip.id}
            class:locked={clip.locked}
            class:muted={clip.muted}
            style="
              left: {getClipLeft(clip)};
              width: {getClipWidth(clip)};
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
                  on:error={e => {
                    e.target.style.display = 'none';
                    const container = e.target.parentElement;
                    const placeholder = container.querySelector('.clip-placeholder');
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
                <div class="clip-placeholder" style="display: none;">
                  Scene {clip.order + 1}
                </div>
              </div>

              <div class="clip-info">
                <span class="clip-duration">{formatTime(clip.duration)}</span>
                <span class="clip-time"
                  >{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</span
                >
                <span class="clip-number">#{clip.order + 1}</span>
              </div>
            </div>

            <!-- Clip Controls -->
            {#if hoveredClip === clip.id || $selectedClip === clip.id}
              <div class="clip-controls">
                <!-- Move Controls -->
                <button
                  class="control-btn small"
                  on:click|stopPropagation={() => handleMoveClip(clip.id, 'left')}
                  title="Move Left"
                  disabled={clip.order === 0}
                >
                  ←
                </button>
                <button
                  class="control-btn small"
                  on:click|stopPropagation={() => handleMoveClip(clip.id, 'right')}
                  title="Move Right"
                  disabled={clip.order === $timelineClips.length - 1}
                >
                  →
                </button>

                <!-- Split Control -->
                <button
                  class="control-btn small"
                  on:click|stopPropagation={() => handleSplitClip(clip.id)}
                  title="Split Clip"
                >
                  <div class="flex items-center justify-center w-full h-full">
                    <MaterialSymbol icon="content_cut" fontSize={14} />
                  </div>
                </button>

                <!-- Lock Control -->
                <button
                  class="control-btn small"
                  class:active={clip.locked}
                  on:click|stopPropagation={() => toggleClipLock(clip.id)}
                  title={clip.locked ? 'Unlock Clip' : 'Lock Clip'}
                >
                  <div class="flex items-center justify-center w-full h-full">
                    <MaterialSymbol icon={clip.locked ? 'lock' : 'lock_open'} fontSize={14} />
                  </div>
                </button>

                <!-- Mute Control -->
                <button
                  class="control-btn small"
                  class:active={clip.muted}
                  on:click|stopPropagation={() => toggleClipMute(clip.id)}
                  title={clip.muted ? 'Unmute Clip' : 'Mute Clip'}
                >
                  <div class="flex items-center justify-center w-full h-full">
                    <MaterialSymbol icon={clip.muted ? 'volume_off' : 'volume_up'} fontSize={14} />
                  </div>
                </button>

                <!-- Delete Control -->
                <button
                  class="control-btn small danger"
                  on:click|stopPropagation={() => handleDeleteClip(clip.id)}
                  title="Delete Clip"
                >
                  <div class="flex items-center justify-center w-full h-full">
                    <MaterialSymbol icon="delete" fontSize={14} />
                  </div>
                </button>
              </div>
            {/if}

            <!-- Merge Indicators -->
            {#if hoveredClip === clip.id && $selectedClip && $selectedClip !== clip.id}
              <div
                class="merge-indicator"
                on:click|stopPropagation={() => handleMergeClips($selectedClip, clip.id)}
              >
                Merge with selected
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
    <div class="clip-stats">
      Clips: {$timelineClips.length} | Locked: {$timelineClips.filter(c => c.locked).length} | Muted:
      {$timelineClips.filter(c => c.muted).length}
    </div>
  </div>
</div>

<!-- Split Modal -->
{#if splitModalOpen}
  <div class="modal-overlay" on:click={() => (splitModalOpen = false)}>
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
        <button class="btn-secondary" on:click={() => (splitModalOpen = false)}>Cancel</button>
        <button class="btn-primary" on:click={confirmSplit}>Split</button>
      </div>
    </div>
  </div>
{/if}

<!-- Merge Modal -->
{#if mergeModalOpen}
  <div class="modal-overlay" on:click={() => (mergeModalOpen = false)}>
    <div class="modal" on:click|stopPropagation>
      <h3>Merge Clips</h3>
      <p>Are you sure you want to merge these two clips?</p>
      <div class="merge-info">
        <div class="clip-info-item">
          <strong>Clip 1:</strong>
          {formatTime($timelineClips.find(c => c.id === mergeClip1)?.startTime || 0)} - {formatTime(
            $timelineClips.find(c => c.id === mergeClip1)?.endTime || 0
          )}
        </div>
        <div class="clip-info-item">
          <strong>Clip 2:</strong>
          {formatTime($timelineClips.find(c => c.id === mergeClip2)?.startTime || 0)} - {formatTime(
            $timelineClips.find(c => c.id === mergeClip2)?.endTime || 0
          )}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" on:click={() => (mergeModalOpen = false)}>Cancel</button>
        <button class="btn-primary" on:click={confirmMerge}>Merge</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .enhanced-timeline-container {
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

  .timeline-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .zoom-level {
    min-width: 40px;
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
  }

  .export-controls {
    display: flex;
    gap: 0.25rem;
  }

  .timeline-track {
    position: relative;
    height: 140px;
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
    height: 120px;
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
    height: 120px;
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .clip-region {
    position: relative;
    height: 100px;
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

  .clip-region.locked {
    border-color: #ffa726;
    background: rgba(255, 167, 38, 0.1) !important;
  }

  .clip-region.muted {
    opacity: 0.6;
    filter: grayscale(0.5);
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

  .clip-thumbnail {
    flex: 1;
    width: 100%;
    height: 70px;
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
    flex-wrap: wrap;
  }

  .control-btn {
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    color: white;
    padding: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .control-btn.small {
    padding: 2px;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    border-radius: 50%;
  }

  .control-btn.active {
    background: rgba(255, 107, 107, 0.3);
    border-color: rgba(255, 107, 107, 0.6);
  }

  .control-btn.danger {
    background: rgba(244, 67, 54, 0.3);
    border-color: rgba(244, 67, 54, 0.6);
  }

  .control-btn.danger:hover {
    background: rgba(244, 67, 54, 0.5);
    border-color: rgba(244, 67, 54, 0.8);
  }

  .control-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .merge-indicator {
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(76, 175, 80, 0.9);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .timeline-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
  }

  .clip-stats {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
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

  .split-controls input[type='range'] {
    flex: 1;
  }

  .split-time {
    color: white;
    font-weight: 500;
    min-width: 60px;
  }

  .merge-info {
    margin-bottom: 2rem;
  }

  .clip-info-item {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 0.5rem;
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
