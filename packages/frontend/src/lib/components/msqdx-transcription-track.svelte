<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { zoomLevel } from '$lib/stores/timeline.store';
  import { MaterialSymbol } from '$lib/components/ui';
  import MsqdxTypography from '$lib/components/ui/MsqdxTypography.svelte';

  const dispatch = createEventDispatcher();

  export let segments: Array<{
    text: string;
    start: number;
    end: number;
  }> = [];

  export let currentTime: number = 0;
  export let duration: number = 0;
  export let videoId: string = '';

  let transcriptionContainer: HTMLDivElement;

  $: activeSegment = segments.find(seg => currentTime >= seg.start && currentTime <= seg.end);

  function handleSegmentClick(segment: { start: number; end: number; text: string }) {
    dispatch('seekTo', { time: segment.start });
  }

  function getSegmentWidth(segment: { start: number; end: number }): string {
    const segmentDuration = segment.end - segment.start;
    const width = Math.max(40, segmentDuration * $zoomLevel * 20);
    return `${width}px`;
  }

  function getSegmentLeft(segment: { start: number; end: number }): string {
    const left = segment.start * $zoomLevel * 20;
    return `${left}px`;
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  function formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  function exportTranscription(format: 'srt' | 'vtt' | 'txt') {
    let content = '';

    if (format === 'srt') {
      segments.forEach((seg, i) => {
        content += `${i + 1}\n`;
        content += `${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}\n`;
        content += `${seg.text}\n\n`;
      });
    } else if (format === 'vtt') {
      content = 'WEBVTT\n\n';
      segments.forEach(seg => {
        content += `${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}\n`;
        content += `${seg.text}\n\n`;
      });
    } else {
      content = segments.map(seg => seg.text).join('\n');
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="transcription-track">
  <div class="track-header">
    <div style="display: flex; align-items: center; gap: var(--msqdx-spacing-xs);">
      <div class="icon-20px"><MaterialSymbol icon="mic" fontSize={20} /></div>
      <MsqdxTypography variant="h6" weight="semibold">Transcription</MsqdxTypography>
    </div>
    <div class="track-info">
      <span class="text-xs text-white/60">{segments.length} segments</span>
      <div class="export-buttons">
        <button
          class="export-btn"
          on:click={() => exportTranscription('srt')}
          title="Export SRT subtitles"
        >
          SRT
        </button>
        <button
          class="export-btn"
          on:click={() => exportTranscription('vtt')}
          title="Export VTT subtitles"
        >
          VTT
        </button>
        <button
          class="export-btn"
          on:click={() => exportTranscription('txt')}
          title="Export plain text"
        >
          TXT
        </button>
      </div>
    </div>
  </div>

  <div class="segments-container" bind:this={transcriptionContainer}>
    <div class="segments-track" style="width: {Math.max(1000, duration * $zoomLevel * 20)}px;">
      {#each segments as segment, i (i)}
        <div
          class="segment"
          class:active={activeSegment === segment}
          style="
            left: {getSegmentLeft(segment)};
            width: {getSegmentWidth(segment)};
          "
          on:click={() => handleSegmentClick(segment)}
          role="button"
          tabindex="0"
          title="Click to seek to {formatTime(segment.start)} - {segment.text}"
        >
          <div class="segment-text">
            {segment.text}
          </div>
          <div class="segment-time">
            {formatTime(segment.start)}
          </div>
        </div>
      {/each}

      <!-- Current time indicator -->
      <div class="time-indicator" style="left: {currentTime * $zoomLevel * 20}px"></div>
    </div>
  </div>
</div>

<style lang="postcss">
  .transcription-track {
    backdrop-filter: blur(20px);
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem;
    margin-top: 0.5rem;
  }

  .track-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .track-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .export-buttons {
    display: flex;
    gap: 0.25rem;
  }

  .export-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .export-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .segments-container {
    position: relative;
    height: 80px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  }

  .segments-container::-webkit-scrollbar {
    height: 8px;
  }

  .segments-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .segments-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }

  .segments-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  .segments-track {
    height: 80px;
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .segment {
    position: absolute;
    height: 100%;
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

  .segment:hover {
    background: rgba(100, 150, 255, 0.5);
    border-color: rgba(100, 150, 255, 0.8);
    transform: translateY(-1px);
  }

  .segment.active {
    background: rgba(255, 107, 107, 0.4);
    border-color: rgba(255, 107, 107, 0.8);
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
  }

  .time-indicator {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #ff6b6b;
    pointer-events: none;
    z-index: 10;
  }

  .icon-20px {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
