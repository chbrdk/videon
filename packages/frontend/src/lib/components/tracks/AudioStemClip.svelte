<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import AudioWaveform from './AudioWaveform.svelte';
  import { MaterialSymbol } from '$lib/components/ui';

  export let audioStemId: string;
  export let stemType: 'vocals' | 'music' | 'original' | 'drums' | 'bass';
  export let startTime: number;
  export let endTime: number;
  export let trimStart: number = 0;
  export let trimEnd: number = 1;
  export let audioLevel: number = 1.0;
  export let isSelected: boolean = false;
  export let isMuted: boolean = false;
  export let showWaveform: boolean = true;
  export let width: number = 200;
  export let height: number = 40;

  // Watch for width/height changes
  $: if (width > 0 && trimWidth > 0) {
    console.log('🎵 Clip dimensions updated:', {
      width,
      height,
      trimWidth,
      trimStartPx,
      trimEndPx,
    });
  }

  const dispatch = createEventDispatcher();

  // Berechne tatsächliche Start/End-Zeiten basierend auf Trim
  $: actualStartTime = startTime + trimStart * (endTime - startTime);
  $: actualEndTime = startTime + trimEnd * (endTime - startTime);
  $: actualDuration = actualEndTime - actualStartTime;

  // Berechne Trim-Positionen als Pixel
  $: trimStartPx = trimStart * width;
  $: trimEndPx = trimEnd * width;
  $: trimWidth = trimEndPx - trimStartPx;

  // Farben für verschiedene Stem-Typen (gedämpft, weniger knallig)
  const stemColors = {
    vocals: '#cc7777',
    music: 'rgb(119, 204, 119)',
    original: '#7777cc',
    drums: '#cc9966',
    bass: '#9966cc',
  };

  $: stemColor = stemColors[stemType] || '#666666';

  // Event-Handler
  function handleMouseDown(event: MouseEvent) {
    event.stopPropagation();
    dispatch('select', { audioStemId, stemType });
  }

  function handleDoubleClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('isolate', { audioStemId, stemType });
  }

  function handleTrimStart(event: MouseEvent) {
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const newTrimStart = Math.max(0, Math.min(1, x / width));

    dispatch('trim', {
      audioStemId,
      trimStart: newTrimStart,
      trimEnd,
    });
  }

  function handleTrimEnd(event: MouseEvent) {
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const newTrimEnd = Math.max(0, Math.min(1, x / width));

    dispatch('trim', {
      audioStemId,
      trimStart,
      trimEnd: newTrimEnd,
    });
  }

  function handleMuteToggle() {
    dispatch('mute', {
      audioStemId,
      isMuted: !isMuted,
    });
  }
</script>

<div
  class="audio-stem-clip"
  class:selected={isSelected}
  class:muted={isMuted}
  style="width: {width}px; height: 100%;"
  on:mousedown={handleMouseDown}
  on:dblclick={handleDoubleClick}
  role="button"
  tabindex="0"
>
  <!-- Hintergrund mit Stem-Farbe -->
  <div class="stem-background" style="background-color: {stemColor}20;">
    <!-- Waveform -->
    {#if showWaveform}
      <div class="waveform-container" style="width: {width}px; left: 0px;">
        <AudioWaveform {audioStemId} {stemType} {startTime} {endTime} {width} {height} />
      </div>
    {/if}

    <!-- Trim-Handles -->
    <div
      class="trim-handle trim-handle-start"
      style="left: {trimStartPx}px;"
      on:mousedown={handleTrimStart}
      role="slider"
      aria-orientation="horizontal"
      aria-valuenow={trimStart * 100}
      aria-valuemin="0"
      aria-valuemax="100"
      tabindex="0"
      title="Trim start"
    ></div>
    <div
      class="trim-handle trim-handle-end"
      style="left: {trimEndPx}px;"
      on:mousedown={handleTrimEnd}
      role="slider"
      aria-orientation="horizontal"
      aria-valuenow={trimEnd * 100}
      aria-valuemin="0"
      aria-valuemax="100"
      tabindex="0"
      title="Trim end"
    ></div>

    <!-- Audio-Level Indicator -->
    <div class="audio-level-indicator" style="opacity: {audioLevel};"></div>

    <!-- Stem-Label -->
    <div class="stem-label" style="color: {stemColor};">
      {stemType.toUpperCase()}
    </div>

    <!-- Mute Button -->
    <button
      class="mute-button"
      class:muted={isMuted}
      on:click={handleMuteToggle}
      on:mousedown|stopPropagation
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      <div class="icon-16px">
        <MaterialSymbol icon={isMuted ? 'volume_off' : 'volume_up'} fontSize={16} />
      </div>
    </button>
  </div>
</div>

<style>
  .audio-stem-clip {
    position: relative;
    cursor: pointer;
    user-select: none;
    border-radius: var(--msqdx-radius-xs);
    overflow: hidden;
    transition: all var(--msqdx-transition-standard);
    height: 100%;
  }

  .audio-stem-clip:hover {
    transform: translateY(-1px);
  }

  .audio-stem-clip.selected {
    outline: 2px solid var(--msqdx-color-brand-blue);
    outline-offset: -2px;
  }

  .audio-stem-clip.muted {
    opacity: 0.5;
  }

  .stem-background {
    position: relative;
    width: 100%;
    height: 100%;
    border: 1px solid var(--msqdx-color-dark-border);
    border-radius: var(--msqdx-radius-xs);
    background: transparent;
  }

  .waveform-container {
    position: absolute;
    top: 4px;
    height: calc(100% - 8px);
    overflow: hidden;
    border-radius: 2px;
  }

  .trim-handle {
    position: absolute;
    top: 0;
    width: 4px;
    height: 100%;
    background: rgba(255, 255, 255, 0.8);
    cursor: ew-resize;
    border-radius: 2px;
    z-index: 10;
  }

  .trim-handle:hover {
    background: rgba(255, 255, 255, 1);
    width: 6px;
  }

  .trim-handle-start {
    left: 0;
  }

  .trim-handle-end {
    right: 0;
  }

  .audio-level-indicator {
    position: absolute;
    bottom: 2px;
    left: 2px;
    right: 2px;
    height: 2px;
    border-radius: 1px;
    background-color: rgba(255, 255, 255, 0.6);
    transition: opacity 0.2s ease;
  }

  .stem-label {
    position: absolute;
    top: 2px;
    left: 4px;
    font-size: 10px;
    font-weight: bold;
    opacity: 0.8;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    z-index: 5;
  }

  .mute-button {
    position: absolute;
    top: 2px;
    right: 2px;
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--msqdx-spacing-xxs);
    opacity: 0.7;
    transition: opacity var(--msqdx-transition-standard);
    z-index: 15;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--msqdx-color-dark-text-primary);
  }

  .mute-button:hover {
    opacity: 1;
  }

  .mute-button.muted {
    opacity: 1;
    color: var(--msqdx-color-status-error);
  }

  .icon-16px {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
