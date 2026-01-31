<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { zoomLevel } from '$lib/stores/timeline.store';
  import type { VoiceSegment } from '$lib/api/voice-segment';
  import VoiceSegmentClip from './VoiceSegmentClip.svelte';

  export let audioStemId: string;
  export let segments: VoiceSegment[] = [];
  export let currentTime: number = 0;
  export let duration: number = 0;

  const dispatch = createEventDispatcher();

  function handleSegmentRightClick(event: MouseEvent, segment: VoiceSegment) {
    event.preventDefault();
    event.stopPropagation();

    // Dispatch event with mouse coordinates to parent
    dispatch('contextmenu', {
      event,
      segment,
    });
  }

  // Reactive functions that recalculate when zoom changes
  $: getSegmentLeft = (startTime: number) => `${startTime * $zoomLevel * 20}px`;

  $: getSegmentWidth = (startTime: number, endTime: number) => {
    const duration = endTime - startTime;
    return `${Math.max(40, duration * $zoomLevel * 20)}px`;
  };

  // Reactive function to force re-render when zoom changes
  $: console.log('🎤 VoiceSegmentTrack zoom updated:', $zoomLevel);
</script>

<div class="voice-segment-track">
  <div class="segments-container">
    <div class="segments-timeline" style="width: {Math.max(1000, duration * $zoomLevel * 20)}px;">
      {#each segments as segment}
        <div
          class="segment-wrapper"
          style="
            left: {getSegmentLeft(segment.startTime)};
            width: {getSegmentWidth(segment.startTime, segment.endTime)};
          "
          on:contextmenu={e => handleSegmentRightClick(e, segment)}
          role="button"
          tabindex="0"
          on:keydown={() => {}}
        >
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <VoiceSegmentClip
            {segment}
            isActive={currentTime >= segment.startTime && currentTime <= segment.endTime}
            on:click={() => dispatch('seek', segment.startTime)}
          />
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .voice-segment-track {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-radius: 8px;
    overflow: hidden;
  }

  .segments-container {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    position: relative;
  }

  .segments-timeline {
    position: relative;
    height: 100%;
    min-width: 100%;
  }

  .segment-wrapper {
    position: absolute;
    top: 8px;
    height: calc(100% - 16px);
  }
</style>
