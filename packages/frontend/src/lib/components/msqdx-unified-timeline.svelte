<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { 
    timelineClips, 
    audioStemClips,
    currentTime, 
    duration, 
    zoomLevel,
    trackConfigs,
    autoScroll,
    playheadPosition,
    showAudioStems,
    audioStemMode,
    showWaveforms,
    updatePlayhead,
    initializeClips,
    audioStemOperations,
    startPlayheadAnimation,
    stopPlayheadAnimation
  } from '$lib/stores/timeline.store';
  import { videosApi } from '$lib/api/videos';
  import { api } from '$lib/config/environment';
  import { audioStemPlayer } from '$lib/services/audio-stem-player.service';
      import SceneTrack from './tracks/SceneTrack.svelte';
      import TranscriptionTrack from './tracks/TranscriptionTrack.svelte';
      import AudioStemClip from './tracks/AudioStemClip.svelte';
      import VoiceSegmentTrack from './tracks/VoiceSegmentTrack.svelte';
      import ReVoiceModal from './ReVoiceModal.svelte';
      import VoiceCloneModal from './VoiceCloneModal.svelte';
      import { voiceSegmentApi } from '$lib/api/voice-segment';
      import { contextMenuStore } from '$lib/stores/context-menu.store';
      import type { VoiceSegment } from '$lib/api/voice-segment';
      import { MaterialSymbol } from '$lib/components/ui';
      import logger from '$lib/utils/logger';
      import MsqdxButton from '$lib/components/ui/MsqdxButton.svelte';

      // ... existing code ...

      // Audio Track Helper Functions
      function getAudioTrackIcon(trackType: string): string {
        switch (trackType) {
          case 'audio-vocals': return 'mic';
          case 'audio-music': return 'music_note';
          case 'audio-original': return 'audio_file';
          default: return 'music_note';
        }
      }

  // Reconstruct missing state and helper functions due to file corruption
  let localAudioClips: any[] = [];
  $: localAudioClips = $audioStemClips || [];

  function getAudioTrackLabel(type: string) {
     if (!type) return '';
     return type.replace('audio-', '').charAt(0).toUpperCase() + type.replace('audio-', '').slice(1);
  }

  // Placeholder implementations for missing functions to allow build
  function getAudioLevelForTrack(type: string) { return 1; }
  function toggleAudioLevelSlider(type: string) { showAudioLevelSlider = showAudioLevelSlider === type ? '' : type; }
  function getMuteStateForTrack(type: string) { return false; }
  function handleAudioLevelSliderChange(type: string, value: number) { /* TODO: Implement */ }
  function handleAudioStemSelect(e: any) { /* TODO: Implement */ }
  function handleAudioStemTrim(e: any) { /* TODO: Implement */ }
  function handleAudioStemLevel(e: any) { /* TODO: Implement */ }
  function handleAudioStemMute(e: any) { /* TODO: Implement */ }
  function handleAudioStemIsolate(e: any) { /* TODO: Implement */ }

  // Variables for missing context
  let showAudioLevelSlider = '';
  let timelineWidth = 0;
  $: timelineWidth = ($duration || 0) * ($zoomLevel || 1) * 20;
  $: timelineDuration = $duration || 0;
  let videoElement: HTMLVideoElement;
  let selectedSegment: any = null;
  let showReVoiceModal = false;
  let showVoiceCloneModal = false;
  $: actualDuration = $duration || 0;

  // Zoom icons
  const ZoomOutIcon = '<span class="material-symbols-outlined">zoom_out</span>';
  const ZoomInIcon = '<span class="material-symbols-outlined">zoom_in</span>';
</script>

<div class="unified-timeline">
  <div class="tracks-scroll-container">
    <div class="tracks-inner" style="width: {timelineWidth}px; min-width: 100%;">
      <!-- Global Playhead -->
      <div class="global-playhead" style="left: {$playheadPosition}px"></div>

      {#each $trackConfigs || [] as track (track.id)}
        {#if track.visible}
          <div class="track" style="height: {track.height}px">
             <div class="track-header">
               <div class="track-label">
                        <div class="icon-18px text-current"><MaterialSymbol icon={getAudioTrackIcon(track.type)} fontSize={18} /></div>
                        {getAudioTrackLabel(track.type)}
                      </div>
                      <div class="track-controls">
                        <MsqdxButton
                          variant="contained"
                          on:click={() => toggleAudioLevelSlider(track.type)}
                          title="Audio Level: {Math.round(getAudioLevelForTrack(track.type) * 100)}%"
                          class="icon-button-small"
                        >
                          <div class="icon-18px"><MaterialSymbol icon={getMuteStateForTrack(track.type) ? 'volume_off' : 'volume_up'} fontSize={18} /></div>
                        </MsqdxButton>
                        
                        <!-- Audio Level Controls direkt in der Toolbar -->
                        {#if showAudioLevelSlider === track.type}
                          <div class="audio-level-inline">
                            <span class="level-percentage">{Math.round(getAudioLevelForTrack(track.type) * 100)}%</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="2" 
                              step="0.1"
                              value={getAudioLevelForTrack(track.type)}
                              on:input={(e) => handleAudioLevelSliderChange(track.type, parseFloat(e.target.value))}
                              class="level-slider-inline"
                            />
                          </div>
                        {/if}
                      </div>
                    </div>
                    
                    <!-- Audio Clips Content -->
                    <div class="track-content" style="height: {track.height}px;">
                      {#each localAudioClips.filter(clip => 
                        (track.type === 'audio-vocals' && clip.stemType === 'vocals') ||
                        (track.type === 'audio-music' && clip.stemType === 'music') ||
                        (track.type === 'audio-original' && clip.stemType === 'original')
                      ) as clip (clip.id)}
                        {@const clipDuration = clip.duration > 0 ? clip.duration : actualDuration}
                        {@const clipWidth = Math.max(clipDuration * $zoomLevel * 20, 50)}
                        <AudioStemClip
                          audioStemId={clip.audioStemId}
                          stemType={clip.stemType}
                          startTime={clip.startTime}
                          endTime={clip.endTime > 0 ? clip.endTime : actualDuration}
                          trimStart={clip.trimStart}
                          trimEnd={clip.trimEnd}
                          audioLevel={clip.audioLevel}
                          isSelected={clip.isSelected}
                          isMuted={clip.isMuted}
                          showWaveform={clip.showWaveform && $showWaveforms}
                          width={clipWidth}
                          height={track.height - 40}
                          on:select={handleAudioStemSelect}
                          on:trim={handleAudioStemTrim}
                          on:audioLevel={handleAudioStemLevel}
                          on:mute={handleAudioStemMute}
                          on:isolate={handleAudioStemIsolate}
                        />
                      {/each}
                    </div>
                  </div>
                {:else}
                  <div class="audio-track-placeholder">
                    <span>No {track.stemType} stems available</span>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/if}
      {/each}
      
      <!-- Timeline Ruler (gemeinsame Zeitachse) - JETZT INNERHALB DES SCROLLBARE BEREICHS -->
      <div class="timeline-ruler">
        <!-- Haupt-Marker (alle 10 Sekunden) -->
        {#each Array.from({length: Math.ceil(timelineDuration / 10)}) as _, i}
          <div 
            class="time-marker clickable main-marker" 
            style="left: {(i * 10) * $zoomLevel * 20}px"
            on:click={() => {
              const targetTime = i * 10;
              console.log('🎯 Jumping to time:', targetTime);
              currentTime.set(targetTime);
              playheadPosition.set((targetTime / timelineDuration) * timelineWidth);
              if (videoElement) {
                videoElement.currentTime = targetTime;
              }
            }}
            title="Click to jump to {formatTime(i * 10)}"
          >
            {formatTime(i * 10)}
          </div>
        {/each}
        
        <!-- Feinere Skala zwischen den Haupt-Markern -->
        {#each Array.from({length: Math.ceil(timelineDuration / 10)}) as _, i}
          {#each Array.from({length: 9}) as _, j}
            {@const timePosition = (i * 10) + (j + 1)}
            {#if timePosition <= timelineDuration}
              <div 
                class="time-marker clickable sub-marker" 
                style="left: {timePosition * $zoomLevel * 20}px"
                on:click={() => {
                  console.log('🎯 Jumping to time:', timePosition);
                  currentTime.set(timePosition);
                  playheadPosition.set((timePosition / timelineDuration) * timelineWidth);
                  if (videoElement) {
                    videoElement.currentTime = timePosition;
                  }
                }}
                title="Click to jump to {formatTime(timePosition)}"
              ></div>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
  </div>

  <!-- Voice Segment Modals -->
  <ReVoiceModal 
    segment={selectedSegment}
    show={showReVoiceModal}
    on:close={() => showReVoiceModal = false}
    on:success={async (event) => {
      if (selectedSegment) {
        console.log('Re-Voice completed for segment:', selectedSegment.id);
        // Reload segments to get updated data
        await reloadVoiceSegments();
      }
      showReVoiceModal = false;
    }}
  />

  <VoiceCloneModal 
    show={showVoiceCloneModal}
    sourceSegment={selectedSegment}
    on:close={() => showVoiceCloneModal = false}
    on:success={() => {
      console.log('Voice cloned successfully');
      showVoiceCloneModal = false;
    }}
  />
  

  <!-- Timeline Toolbar -->
  <div class="timeline-toolbar">
    <!-- Audio Stem Controls -->
    
    <div class="zoom-controls">
      <button 
        class="control-btn small"
        on:click={() => {
          const newZoom = Math.max(0.1, $zoomLevel - 0.2);
          console.log('🔍 Zoom out:', $zoomLevel, '→', newZoom);
          zoomLevel.set(newZoom);
        }}
        title="Zoom Out"
      >
        <div class="icon-18px text-current">{@html ZoomOutIcon}</div>
      </button>
      <span class="zoom-level">{Math.round($zoomLevel * 100)}%</span>
      <button 
        class="control-btn small"
        on:click={() => {
          const newZoom = Math.min(5, $zoomLevel + 0.2);
          console.log('🔍 Zoom in:', $zoomLevel, '→', newZoom);
          zoomLevel.set(newZoom);
        }}
        title="Zoom In"
      >
        <div class="icon-18px text-current">{@html ZoomInIcon}</div>
      </button>
    </div>
  </div>
</div>

<style lang="postcss">
  .unified-timeline {
    backdrop-filter: blur(var(--msqdx-glass-blur));
    background: var(--msqdx-color-dark-paper);
    border: 1px solid var(--msqdx-color-dark-border);
    border-radius: 0 0 var(--msqdx-radius-xxl) var(--msqdx-radius-xxl);
    padding: 0 0 var(--msqdx-spacing-lg) 0;
    margin: 0;
  }
  
  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--msqdx-spacing-md);
  }
  
  .timeline-header h3 {
    color: var(--msqdx-color-dark-text-primary);
    font-size: var(--msqdx-font-size-xl);
    font-weight: var(--msqdx-font-weight-semibold);
    font-family: var(--msqdx-font-primary);
    margin: 0;
  }
  
  .timeline-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--msqdx-spacing-sm);
    background: var(--msqdx-color-dark-paper);
    backdrop-filter: blur(var(--msqdx-glass-blur));
    -webkit-backdrop-filter: blur(var(--msqdx-glass-blur));
    border: 1px solid var(--msqdx-color-dark-border);
    border-top: 1px solid rgba(255, 255, 255, 0.18);
    border-left: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: var(--msqdx-radius-full);
    padding: var(--msqdx-spacing-xxs);
    margin-top: var(--msqdx-spacing-md);
    margin-left: auto;
    margin-right: 30px;
    width: fit-content;
    transition: all var(--msqdx-transition-standard);
  }
  
  :global(html.light) .timeline-toolbar {
    background: var(--msqdx-color-light-paper);
    border: 1px solid var(--msqdx-color-light-border);
    border-top: 1px solid rgba(0, 0, 0, 0.18);
    border-left: 1px solid rgba(0, 0, 0, 0.18);
  }
  
  .audio-stem-controls {
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-sm);
  }
  
  .audio-mode-select {
    background: var(--msqdx-color-dark-paper);
    border: 1px solid var(--msqdx-color-dark-border);
    color: var(--msqdx-color-dark-text-primary);
    padding: var(--msqdx-spacing-xxs) var(--msqdx-spacing-sm);
    border-radius: var(--msqdx-radius-md);
    font-size: var(--msqdx-font-size-xs);
    font-family: var(--msqdx-font-primary);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
  }
  
  .audio-mode-select:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .audio-mode-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .audio-mode-select option {
    background: var(--msqdx-color-dark-paper);
    color: var(--msqdx-color-dark-text-primary);
  }
  
  .audio-stem-track {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  
  .audio-track-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--msqdx-color-dark-text-secondary);
    font-size: var(--msqdx-font-size-xs);
    font-family: var(--msqdx-font-primary);
    font-style: italic;
  }
  
  .control-btn {
    background: var(--msqdx-color-dark-paper);
    border: 1px solid var(--msqdx-color-dark-border);
    color: var(--msqdx-color-dark-text-primary);
    padding: var(--msqdx-spacing-sm);
    border-radius: var(--msqdx-radius-full);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
    font-size: var(--msqdx-font-size-body1);
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn.small {
    width: 1.75rem;
    height: 1.75rem;
    font-size: var(--msqdx-font-size-xs);
    padding: var(--msqdx-spacing-xxs);
  }
  
  .control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--msqdx-color-brand-orange);
  }
  
  .control-btn.active {
    background: var(--msqdx-color-tint-blue);
    border-color: var(--msqdx-color-brand-blue);
  }

  /* Auto-Scroll Switch */
  .auto-scroll-switch {
    display: flex;
    align-items: center;
  }

  .switch-btn {
    position: relative;
    width: 2rem;
    height: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 0;
    outline: none;
  }

  .switch-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .switch-btn.active {
    background: rgba(100, 150, 255, 0.4);
    border-color: rgba(100, 150, 255, 0.6);
  }

  .switch-thumb {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 0.75rem;
    height: 0.75rem;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s ease;
  }

  .switch-btn.active .switch-thumb {
    transform: translateX(1rem);
  }
  
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  
  .zoom-level {
    color: white;
    font-size: 0.75rem;
    min-width: 2.5rem;
    text-align: center;
    font-weight: 500;
  }
  
  .timeline-ruler {
    position: relative;
    height: 30px;
    background: var(--msqdx-color-dark-paper);
    border-top: 1px solid var(--msqdx-color-dark-border);
    margin-top: var(--msqdx-spacing-sm);
    border-radius: var(--msqdx-radius-xs);
    overflow: hidden; /* Prevent ruler from breaking out to the right */
  }
  
  .time-marker {
    position: absolute;
    color: var(--msqdx-color-dark-text-secondary);
    font-size: var(--msqdx-font-size-xs);
    font-family: var(--msqdx-font-primary);
    top: 5px;
    font-weight: var(--msqdx-font-weight-medium);
  }

  .time-marker.clickable {
    cursor: pointer;
    padding: var(--msqdx-spacing-xxs) var(--msqdx-spacing-xxs);
    border-radius: var(--msqdx-radius-xs);
    transition: all var(--msqdx-transition-standard);
  }

  .time-marker.clickable:hover {
    color: var(--msqdx-color-dark-text-primary);
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }

  .time-marker.main-marker {
    font-weight: var(--msqdx-font-weight-semibold);
    font-size: var(--msqdx-font-size-sm);
  }

  .time-marker.sub-marker {
    width: 8px; /* Größerer Klickbereich */
    height: 8px;
    background: transparent; /* Unsichtbarer Hintergrund */
    top: 2px;
    font-size: 0;
    padding: 0;
    border-radius: 0;
    margin-left: -4px; /* Zentrieren des Klickbereichs um den 1px Strich */
    position: absolute;
  }

  .time-marker.sub-marker::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    width: 1px;
    height: 8px;
    background: rgba(255, 255, 255, 0.4);
  }

  .time-marker.sub-marker:hover::before {
    background: rgba(255, 255, 255, 0.8);
    height: 12px;
  }
  
  .tracks-scroll-container {
    position: relative;
    overflow-x: auto;
    overflow-y: auto;
    max-height: 500px;
    scrollbar-width: thin;
    scrollbar-color: var(--msqdx-color-dark-border) transparent;
    border-radius: var(--msqdx-radius-sm);
    background: transparent;
  }

  .tracks-scroll-container::-webkit-scrollbar {
    height: var(--msqdx-spacing-xs);
    width: var(--msqdx-spacing-xs);
  }

  .tracks-scroll-container::-webkit-scrollbar-track {
    background: transparent;
    border-radius: var(--msqdx-radius-xs);
  }

  .tracks-scroll-container::-webkit-scrollbar-thumb {
    background: var(--msqdx-color-dark-border);
    border-radius: var(--msqdx-radius-xs);
  }

  .tracks-scroll-container::-webkit-scrollbar-thumb:hover {
    background: var(--msqdx-color-dark-text-secondary);
  }
  
  .tracks-inner {
    position: relative;
    min-height: 200px;
  }
  
  .global-playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #ff6b6b;
    z-index: 100;
    pointer-events: none;
    transform: translateX(-1px); /* Center the 2px line */
  }
  
  .global-playhead::before {
    content: '';
    position: absolute;
    top: -8px;
    left: -6px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid #ff6b6b;
  }
  
  .track {
    position: relative;
    background: transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
  }
  
  .track:last-child {
    border-bottom: none;
  }
  
  .track-content .audio-stem-clip{
  height: 100%!important;
  }
  .track-content {
    flex: 1;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  /* Audio Track Controls Styles (exact copy from SceneTrack) */
  .audio-stem-track {
    position: relative;
    width: 100%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    background: transparent;
  }
  
  .track-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
  }

  .track-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .track-controls {
    display: flex;
    gap: var(--msqdx-spacing-xs);
    position: sticky;
    right: 0;
    top: 0;
    z-index: 10;
    background: var(--msqdx-color-brand-orange);
    border: 1px solid var(--msqdx-color-brand-orange);
    border-radius: var(--msqdx-radius-full);
    padding: var(--msqdx-spacing-xs);
    margin-left: auto;
    flex-shrink: 0;
    align-items: center;
    height: fit-content;
  }

  .control-btn.small {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
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
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  :global(.msqdx-button.icon-button-small) {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    min-height: 32px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .audio-level-inline {
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-xxs);
    margin-left: var(--msqdx-spacing-xxs);
    padding: var(--msqdx-spacing-xxs) var(--msqdx-spacing-xs);
    background: rgba(255, 255, 255, 0.15);
    border-radius: var(--msqdx-radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .level-percentage {
    font-size: var(--msqdx-font-size-sm);
    color: var(--msqdx-color-brand-white);
    font-weight: var(--msqdx-font-weight-semibold);
    font-family: var(--msqdx-font-primary);
    min-width: 2.5rem;
    text-align: center;
  }

  .level-slider-inline {
    width: 80px;
    height: 3px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: var(--msqdx-radius-xs);
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
    background: var(--msqdx-color-brand-white);
    border-radius: var(--msqdx-radius-full);
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }

  .level-slider-inline::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--msqdx-color-brand-white);
    border-radius: var(--msqdx-radius-full);
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }
  
  .icon-18px {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Responsive Timeline Styles */
  @media (max-width: 768px) {
    .timeline-controls {
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.5rem;
    }
    
    .zoom-controls {
      order: 1;
      width: 100%;
      justify-content: center;
    }
    
    .time-display {
      font-size: 0.75rem;
    }
    
    .track-label {
      font-size: 0.7rem;
      padding: 0.25rem;
    }
    
    .control-btn.small {
      min-width: 44px;
      min-height: 44px;
    }
    
    .tracks-scroll-container {
      max-height: 400px;
    }
  }
  
  
  @media (max-width: 640px) {
    .track-label {
      font-size: 0.65rem;
      padding: 0.25rem;
      min-width: 60px;
    }
    
    .timeline-ruler {
      font-size: 0.65rem;
      height: 25px;
    }
    
    .time-marker {
      font-size: 0.65rem;
    }
    
    .track-label-container {
      min-width: 80px;
    }
    
    .tracks-scroll-container {
      max-height: 300px;
    }
  }
</style>
