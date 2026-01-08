<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api } from '$lib/config/environment';
  import PlayArrowIcon from '@material-icons/svg/svg/play_arrow/baseline.svg?raw';
  import PauseIcon from '@material-icons/svg/svg/pause/baseline.svg?raw';
  import VolumeUpIcon from '@material-icons/svg/svg/volume_up/baseline.svg?raw';
  import VolumeOffIcon from '@material-icons/svg/svg/volume_off/baseline.svg?raw';
  import MovieIcon from '@material-icons/svg/svg/movie/baseline.svg?raw';
  
  const dispatch = createEventDispatcher();

  export let scenes: any[] = [];
  export let zoomLevel: number = 1;
  export let videoDuration: number = 0;
  export let videoId: string = '';
  export let isProject: boolean = false;
  
  // Video audio control state
  let videoMuted = false;
  let videoAudioLevel = 100; // 0-200%
  let showVideoLevelSlider = false;
  
  // Resize state
  let isResizing = false;
  let resizeHandle: 'start' | 'end' | null = null;
  let resizeStartX = 0;
  let resizeStartTime = 0;
  let originalStartTime = 0;
  let originalEndTime = 0;
  let currentResizeScene: any = null;
  
  // Reactive functions that recalculate when zoom changes
  $: getClipLeft = (startTime: number) => `${startTime * zoomLevel * 20}px`;
  $: getClipWidth = (startTime: number, endTime: number) => {
    const duration = endTime - startTime;
    return `${Math.max(40, duration * zoomLevel * 20)}px`;
  };
  
  // Reactive function to force re-render when zoom changes
  $: console.log('🎬 SceneTrack zoom updated:', zoomLevel);
  
  function handleSceneClick(scene: { id: string; startTime: number; endTime: number; videoId: string }) {
    dispatch('seekTo', { time: scene.startTime });
    dispatch('sceneClick', scene);
  }

  function handleDeleteScene(scene: { id: string; startTime: number; endTime: number; videoId: string }, event: Event) {
    event.stopPropagation(); // Prevent scene click
    dispatch('deleteScene', scene);
  }

  // Video audio control functions
  function toggleVideoLevelSlider() {
    showVideoLevelSlider = !showVideoLevelSlider;
  }

  function toggleVideoMute() {
    videoMuted = !videoMuted;
    dispatch('videoMuteToggle', { muted: videoMuted });
  }

  function updateVideoAudioLevel() {
    dispatch('videoAudioLevelChange', { audioLevel: videoAudioLevel });
  }

  // Create scene video for Project scenes
  function createSceneVideo(scene: any) {
    if (isProject && scene.videoId) {
      const trimStart = scene.trimStart || 0;
      const trimEnd = scene.trimEnd || 0;
      return `${api.baseUrl}/videos/${scene.videoId}/scene-video?startTime=${scene.startTime}&endTime=${scene.endTime}&trimStart=${trimStart}&trimEnd=${trimEnd}`;
    }
    return null;
  }
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Resize functions
  function handleResizeStart(event: MouseEvent, scene: any, handle: 'start' | 'end') {
    if (!isProject) return; // Only allow resizing in project mode
    
    event.preventDefault();
    event.stopPropagation();
    
    isResizing = true;
    resizeHandle = handle;
    resizeStartX = event.clientX;
    resizeStartTime = handle === 'start' ? scene.startTime : scene.endTime;
    originalStartTime = scene.startTime;
    originalEndTime = scene.endTime;
    currentResizeScene = scene;
    
    // Add global event listeners
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    
    // Change cursor
    document.body.style.cursor = 'ew-resize';
  }
  
  function handleResizeMove(event: MouseEvent) {
    if (!isResizing || !resizeHandle) return;
    
    const deltaX = event.clientX - resizeStartX;
    const deltaTime = deltaX / (zoomLevel * 20); // Convert pixels to time
    const newTime = resizeStartTime + deltaTime;
    
    console.log('🔧 Resize Debug:', {
      deltaX,
      zoomLevel,
      deltaTime,
      resizeStartTime,
      newTime,
      videoDuration,
      handle: resizeHandle
    });
    
    // Dispatch resize event with preview
    dispatch('sceneResize', {
      sceneId: currentResizeScene.id || currentResizeScene.sceneId,
      handle: resizeHandle,
      newTime: Math.max(0, Math.min(videoDuration, newTime)),
      originalStartTime,
      originalEndTime
    });
  }
  
  function handleResizeEnd(event: MouseEvent) {
    if (!isResizing || !resizeHandle) return;
    
    const deltaX = event.clientX - resizeStartX;
    const deltaTime = deltaX / (zoomLevel * 20);
    const newTime = Math.max(0, Math.min(videoDuration, resizeStartTime + deltaTime));
    
    // Dispatch final resize event
    dispatch('sceneResizeEnd', {
      sceneId: currentResizeScene.id || currentResizeScene.sceneId,
      handle: resizeHandle,
      newTime,
      originalStartTime,
      originalEndTime
    });
    
    // Cleanup
    isResizing = false;
    resizeHandle = null;
    currentResizeScene = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
  }
  
  // Drag & Drop functions for reordering
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let currentDragScene: any = null;
  let dragOffset = 0;
  let draggedOverIndex = -1;
  
  function handleDragStart(event: MouseEvent, scene: any) {
    if (event.button !== 0) return; // Only left mouse button
    if (!isProject) return; // Only allow dragging in project mode
    if (isResizing) return; // Don't start drag if already resizing
    
    // Check if clicking on resize handles or their children
    const target = event.target as HTMLElement;
    if (target.classList.contains('resize-handle') || target.closest('.resize-handle')) {
      return; // Let resize handle handle the event
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    currentDragScene = scene;
    dragOffset = 0;
    draggedOverIndex = -1;
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = 'grabbing';
  }
  
  function handleDragMove(event: MouseEvent) {
    if (!isDragging || !currentDragScene || isResizing) return;
    
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    
    // Only allow horizontal dragging for reordering
    dragOffset = deltaX;
    
    // Find which scene we're hovering over
    const sceneElements = document.querySelectorAll('.scene-clip');
    let newIndex = -1;
    
    sceneElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right) {
        newIndex = index;
      }
    });
    
    if (newIndex !== draggedOverIndex) {
      draggedOverIndex = newIndex;
      // Visual feedback could be added here
    }
  }
  
  function handleDragEnd() {
    if (!isDragging || !currentDragScene || isResizing) return;
    
    // Find current index of dragged scene
    const currentIndex = scenes.findIndex(s => s.id === currentDragScene.id);
    
    // Only reorder if we're hovering over a different scene
    if (draggedOverIndex !== -1 && draggedOverIndex !== currentIndex) {
      // Dispatch reorder event
      dispatch('sceneReorder', {
        scene: currentDragScene,
        fromIndex: currentIndex,
        toIndex: draggedOverIndex
      });
    }
    
    isDragging = false;
    currentDragScene = null;
    dragOffset = 0;
    draggedOverIndex = -1;
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = '';
  }
</script>

<div class="scene-track">
  {#each scenes as scene, i (scene.sceneId || scene.id)}
    <div 
      class="scene-clip {isDragging && currentDragScene?.id === scene.id ? 'dragging' : ''}"
      style="
        left: {getClipLeft(scene.startTime)};
        width: {getClipWidth(scene.startTime, scene.endTime)};
        transform: {isDragging && currentDragScene?.id === scene.id ? `translateX(${dragOffset}px)` : 'none'};
      "
      on:click={() => handleSceneClick(scene)}
      on:mousedown={(e) => handleDragStart(e, scene)}
      role="button"
      tabindex="0"
      title="Scene {i+1}: {formatTime(scene.startTime)} - {formatTime(scene.endTime)} ({(scene.endTime - scene.startTime).toFixed(1)}s)"
    >
      <!-- Always use thumbnail for Project Scenes (Szene-Videos werden on-demand generiert) -->
      <img 
        src={scene.sceneId ? 
          `${api.baseUrl}/videos/${videoId}/scenes/${scene.sceneId}/thumbnail` :
          `${api.baseUrl}/videos/${scene.videoId}/thumbnail?t=${Math.floor(scene.startTime)}`
        }
        alt="Scene {i+1}"
        class="clip-thumbnail"
        on:error={(e) => {
          const target = e.target as HTMLImageElement;
          if (target) {
            target.style.display = 'none';
            const nextSibling = target.nextElementSibling as HTMLElement;
            if (nextSibling) {
              nextSibling.style.display = 'flex';
            }
          }
        }}
      />
      
      <div class="clip-placeholder">
        <span class="scene-number">{i + 1}</span>
      </div>
      <div class="clip-label">
        {scene.sceneId ? `Scene ${i+1}` : (scene.video?.originalName || `Video ${scene.videoId}`)}
      </div>
      <div class="clip-time">
        {formatTime(scene.startTime)}
      </div>
      
      <!-- Delete Button (only in project mode) -->
      {#if isProject}
        <button 
          class="delete-button"
          on:click={(e) => handleDeleteScene(scene, e)}
          title="Delete scene"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      {/if}
      
      <!-- Resize Handles (only in project mode) -->
      {#if isProject}
        <div 
          class="resize-handle resize-handle-start"
          on:mousedown={(e) => handleResizeStart(e, scene, 'start')}
          title="Resize start"
        ></div>
        <div 
          class="resize-handle resize-handle-end"
          on:mousedown={(e) => handleResizeStart(e, scene, 'end')}
          title="Resize end"
        ></div>
      {/if}
    </div>
  {/each}
  
  <!-- Video Audio Controls (wie bei anderen Tracks) -->
  <div class="track-header">
    <div class="track-label">
      <div class="icon-18px text-current">{@html MovieIcon}</div> Video Audio
    </div>
    <div class="track-controls">
      <button class="control-btn small audio-level-btn" on:click={toggleVideoLevelSlider} title="Audio Level: {videoAudioLevel}%">
        <div class="icon-18px text-current">{@html (videoMuted ? VolumeOffIcon : VolumeUpIcon)}</div>
      </button>
      
      <!-- Audio Level Controls direkt in der Toolbar -->
      {#if showVideoLevelSlider}
        <div class="audio-level-inline">
          <span class="level-percentage">{videoAudioLevel}%</span>
          <input 
            type="range" 
            min="0" 
            max="200" 
            bind:value={videoAudioLevel}
            on:input={updateVideoAudioLevel}
            class="level-slider-inline"
          />
        </div>
      {/if}
    </div>
  </div>
</div>

<style lang="postcss">
  .scene-track {
    position: relative;
    height: 100%;
    width: 100%;
  }
  
  .scene-clip {
    position: absolute;
    height: 90%;
    top: 5%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
  }
  
  .scene-clip:hover {
    border-color: rgba(255, 255, 255, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .scene-clip:focus {
    outline: 2px solid rgba(100, 150, 255, 0.6);
    outline-offset: 2px;
  }
  
  .clip-thumbnail {
    width: 100%;
    height: 70%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .clip-video {
    width: 100%;
    height: 70%;
    object-fit: cover;
    flex-shrink: 0;
  }
  
  .clip-placeholder {
    width: 100%;
    height: 70%;
    background: rgba(100, 150, 255, 0.2);
    display: none;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .scene-number {
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
  }
  
  .clip-label {
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 4px;
    font-size: 0.6rem;
    text-align: center;
    flex-shrink: 0;
  }
  
  .clip-time {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 1px 3px;
    font-size: 0.5rem;
    border-radius: 2px;
  }
  
  /* Resize Handles */
  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 8px;
    background: rgba(100, 150, 255, 0.6);
    cursor: ew-resize;
    opacity: 0.3;
    transition: opacity 0.2s ease;
    z-index: 10;
  }
  
  .resize-handle-start {
    left: -3px;
    border-radius: 3px 0 0 3px;
  }
  
  .resize-handle-end {
    right: -3px;
    border-radius: 0 3px 3px 0;
  }
  
  .scene-clip:hover .resize-handle {
    opacity: 0.8;
  }
  
  .resize-handle:hover {
    background: rgba(100, 150, 255, 0.9);
    opacity: 1;
  }
  
  /* Resizing state */
  .scene-clip.resizing {
    border-color: rgba(100, 150, 255, 0.8);
    box-shadow: 0 0 10px rgba(100, 150, 255, 0.5);
  }
  
  /* Delete Button */
  .delete-button {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 20px;
    height: 20px;
    background: rgba(255, 0, 0, 0.8);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s ease;
    z-index: 10;
  }
  
  .scene-clip:hover .delete-button {
    opacity: 1;
  }
  
  .delete-button:hover {
    background: rgba(255, 0, 0, 1);
    transform: scale(1.1);
  }

  /* Track Header Styles (wie bei AudioTrack) */
  .track-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    position: relative;
    width: 100%;
  }

  .track-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .track-controls {
    display: flex;
    gap: 0.5rem;
    position: sticky;
    right: 0;
    top: 0;
    z-index: 10;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 2rem;
    padding: 0.5rem 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-left: auto;
    flex-shrink: 0;
  }

  .control-btn.small {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.25rem;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn.small:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .audio-level-btn {
    background: rgba(255, 255, 255, 0.15) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
  }

  .audio-level-btn:hover {
    background: rgba(255, 255, 255, 0.25) !important;
  }

  .audio-level-inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .level-percentage {
    font-size: 0.75rem;
    color: white;
    font-weight: 600;
    min-width: 2.5rem;
    text-align: center;
  }

  .level-slider-inline {
    width: 80px;
    height: 3px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  .level-slider-inline::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: #007AFF;
    border-radius: 50%;
    cursor: pointer;
    border: 1px solid white;
  }

  .level-slider-inline::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #007AFF;
    border-radius: 50%;
    cursor: pointer;
    border: 1px solid white;
  }

  .icon-18px {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Drag & Drop Styles */
  .scene-clip.dragging {
    cursor: grabbing !important;
    z-index: 1000;
    transform: scale(1.05) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3) !important;
    border-color: rgba(255, 255, 255, 0.5) !important;
  }
  
  .scene-clip.dragging .clip-thumbnail {
    opacity: 0.8;
  }
  
  .scene-clip:hover:not(.dragging) {
    cursor: grab;
  }
</style>
