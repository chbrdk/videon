<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { VoiceSegment } from '$lib/api/voice-segment';

  import { MaterialSymbol } from '$lib/components/ui';

  export let segment: VoiceSegment;
  export let isActive: boolean = false;

  const dispatch = createEventDispatcher();

  $: statusColor =
    {
      ORIGINAL: '#4a9eff',
      EDITED_TEXT: '#ffa500',
      GENERATING: '#ffff00',
      COMPLETED: '#00ff00',
      ERROR: '#ff0000',
    }[segment.status] || '#666';

  $: hasReVoiced = segment.reVoicedFilePath !== null;

  function handleClick() {
    dispatch('click');
  }
</script>

<div
  class="voice-segment-clip"
  class:active={isActive}
  class:revoiced={hasReVoiced}
  style="border-color: {statusColor};"
  on:click={handleClick}
  role="button"
  tabindex="0"
>
  <div class="segment-text">
    {segment.editedText || segment.originalText}
  </div>

  {#if hasReVoiced}
    <div class="revoice-indicator" title="Re-Voiced">
      <span class="icon-16px"><MaterialSymbol icon="mic" fontSize={16} /></span>
    </div>
  {/if}

  {#if segment.status === 'GENERATING'}
    <div class="generating-indicator">
      <div class="spinner"></div>
    </div>
  {/if}

  <div class="segment-duration">
    {segment.duration.toFixed(1)}s
  </div>
</div>

<style>
  .voice-segment-clip {
    position: relative;
    height: 100%;
    background: rgba(74, 158, 255, 0.2);
    border: 2px solid #4a9eff;
    border-radius: 6px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .voice-segment-clip:hover {
    background: rgba(74, 158, 255, 0.3);
    transform: translateY(-2px);
  }

  .voice-segment-clip.active {
    background: rgba(255, 107, 107, 0.3);
    border-color: #ff6b6b;
    box-shadow: 0 0 12px rgba(255, 107, 107, 0.5);
  }

  .voice-segment-clip.revoiced {
    background: rgba(0, 255, 0, 0.15);
  }

  .segment-text {
    color: white;
    font-size: 12px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    flex: 1;
  }

  .revoice-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .icon-16px {
    display: inline-block;
    width: 16px;
    height: 16px;
  }

  .generating-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .spinner {
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .segment-duration {
    color: rgba(255, 255, 255, 0.7);
    font-size: 10px;
    text-align: right;
    margin-top: 4px;
  }
</style>
