<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();

  export let segments: any[] = [];
  export let zoomLevel: number = 1;
  export let videoDuration: number = 0;
  export let currentTime: number = 0;
  
  // Reactive functions that recalculate when zoom changes
  $: getSegmentLeft = (startTime: number) => `${startTime * zoomLevel * 20}px`;
  $: getSegmentWidth = (startTime: number, endTime: number) => {
    const duration = endTime - startTime;
    return `${Math.max(20, duration * zoomLevel * 20)}px`;
  };
  
  // Reactive function to force re-render when zoom changes
  $: console.log('🎤 TranscriptionTrack zoom updated:', zoomLevel);
  
  function isActive(segment: { start: number; end: number }): boolean {
    return currentTime >= segment.start && currentTime <= segment.end;
  }
  
  function handleSegmentClick(segment: { start: number; end: number; text: string }) {
    dispatch('seekTo', { time: segment.start });
  }
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="transcription-track">
  {#each segments as segment, i (i)}
    <div 
      class="transcription-segment"
      class:active={isActive(segment)}
      style="
        left: {getSegmentLeft(segment.start)};
        width: {getSegmentWidth(segment.start, segment.end)};
      "
      on:click={() => handleSegmentClick(segment)}
      role="button"
      tabindex="0"
      title="Click to seek to {formatTime(segment.start)} - {segment.text}"
    >
      <span class="segment-text">{segment.text}</span>
      <div class="segment-time">
        {formatTime(segment.start)}
      </div>
    </div>
  {/each}
</div>

<style lang="postcss">
  .transcription-track {
    position: relative;
    height: 100%;
    width: 100%;
  }
  
  .transcription-segment {
    position: absolute;
    height: 80%;
    top: 10%;
    background: rgba(100, 150, 255, 0.3);
    border: 1px solid rgba(100, 150, 255, 0.5);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 4px;
    min-width: 80px;
  }
  
  .transcription-segment:hover {
    background: rgba(100, 150, 255, 0.5);
    border-color: rgba(100, 150, 255, 0.8);
    transform: translateY(-1px);
  }
  
  .transcription-segment:focus {
    outline: 2px solid rgba(100, 150, 255, 0.6);
    outline-offset: 2px;
  }
  
  .transcription-segment.active {
    background: rgba(255, 107, 107, 0.4);
    border-color: rgba(255, 107, 107, 0.8);
    box-shadow: 0 0 8px rgba(255, 107, 107, 0.3);
  }
  
  .segment-text {
    font-size: 0.65rem;
    color: white;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    flex: 1;
  }
  
  .segment-time {
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.7);
    text-align: right;
    margin-top: 2px;
    flex-shrink: 0;
  }
</style>
