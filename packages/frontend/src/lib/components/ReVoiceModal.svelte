<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { currentLocale, _ } from '$lib/i18n';
  import { voiceSegmentApi } from '$lib/api/voice-segment';
  import type { VoiceSegment, ElevenLabsVoice, VoiceClone } from '$lib/api/voice-segment';

  import { MaterialSymbol } from '$lib/components/ui';

  export let segment: VoiceSegment | null;
  export let show: boolean = false;

  const dispatch = createEventDispatcher();

  let editedText = '';
  let selectedVoiceId = '';
  let voices: ElevenLabsVoice[] = [];
  let voiceClones: VoiceClone[] = [];

  // Voice Settings
  let stability = 0.5;
  let similarityBoost = 0.75;
  let style = 0.0;
  let useSpeakerBoost = true;

  const textAreaId = 'revoice-text';
  const voiceSelectId = 'revoice-voice';
  const stabilityRangeId = 'revoice-stability';
  const similarityRangeId = 'revoice-similarity';
  const styleRangeId = 'revoice-style';
  const speakerBoostId = 'revoice-speaker-boost';

  // Live Preview
  let previewAudio: HTMLAudioElement | null = null;
  let isPreviewPlaying = false;
  let previewDebounceTimer: ReturnType<typeof setTimeout>;

  $: if (segment) {
    editedText = segment.editedText || segment.originalText;
    selectedVoiceId = segment.voiceId || '';
    stability = segment.stability;
    similarityBoost = segment.similarityBoost;
    style = segment.style;
    useSpeakerBoost = segment.useSpeakerBoost;
  }

  onMount(async () => {
    await loadVoices();
    await loadVoiceClones();
  });

  async function loadVoices() {
    voices = await voiceSegmentApi.getVoices();
  }

  async function loadVoiceClones() {
    voiceClones = await voiceSegmentApi.getVoiceClones();
  }

  // Live Preview mit Debounce
  function handleTextChange() {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(() => {
      if (editedText && selectedVoiceId) {
        triggerLivePreview();
      }
    }, 1000); // 1 Sekunde Debounce
  }

  async function triggerLivePreview() {
    if (!editedText || !selectedVoiceId) return;

    try {
      isPreviewPlaying = true;

      const audioUrl = await voiceSegmentApi.previewVoice({
        text: editedText,
        voiceId: selectedVoiceId,
        voiceSettings: {
          stability,
          similarityBoost,
          style,
          useSpeakerBoost,
        },
      });

      if (previewAudio) {
        previewAudio.pause();
      }

      previewAudio = new Audio(audioUrl);
      await previewAudio.play();

      previewAudio.onended = () => {
        isPreviewPlaying = false;
      };
    } catch (error) {
      console.error('Preview failed:', error);
      isPreviewPlaying = false;
    }
  }

  function stopPreview() {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }
    isPreviewPlaying = false;
  }

  async function handleReVoice() {
    if (!segment || !selectedVoiceId) return;

    try {
      const updatedSegment = await voiceSegmentApi.reVoiceSegment(segment.id, {
        voiceId: selectedVoiceId,
        text: editedText,
        voiceSettings: {
          stability,
          similarityBoost,
          style,
          useSpeakerBoost,
        },
      });

      // Dispatch success with updated segment
      dispatch('success', updatedSegment);
      handleClose();
    } catch (error) {
      console.error('Re-Voice failed:', error);
      alert(_('revoice.alertFailed') + (error as Error).message);
    }
  }

  function handleClose() {
    stopPreview();
    dispatch('close');
  }

  $: if (editedText || selectedVoiceId) {
    handleTextChange();
  }
</script>

{#if show && segment}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={handleClose}>
    <div class="modal-content glass-card" on:click|stopPropagation>
      <div class="modal-header">
        <h2>
          <span class="icon-24px"><MaterialSymbol icon="mic" fontSize={24} /></span>
          {_('revoice.title')}
        </h2>
        <button class="close-btn" on:click={handleClose} title="Close">
          <span class="icon-32px"><MaterialSymbol icon="close" fontSize={32} /></span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Text Editor -->
        <div class="form-group">
          <label for={textAreaId}>{_('revoice.textLabel')}</label>
          <textarea
            id={textAreaId}
            bind:value={editedText}
            rows="4"
            placeholder={_('revoice.enterTextPlaceholder')}
            class="text-editor"
          ></textarea>
          <small class="text-info">
            {_('revoice.originalLabel')} "{segment.originalText}"
          </small>
        </div>

        <!-- Voice Selection -->
        <div class="form-group">
          <label for={voiceSelectId}>{_('revoice.voiceLabel')}</label>
          <select id={voiceSelectId} bind:value={selectedVoiceId}>
            <option value="">{_('revoice.selectVoicePlaceholder')}</option>

            {#if voiceClones.length > 0}
              <optgroup label={_('revoice.clonedVoices')}>
                {#each voiceClones as clone}
                  <option value={clone.elevenLabsVoiceId}>
                    {clone.name}
                  </option>
                {/each}
              </optgroup>
            {/if}

            <optgroup label={_('revoice.elevenLabsVoices')}>
              {#each voices as voice}
                <option value={voice.voice_id}>
                  {voice.name}
                </option>
              {/each}
            </optgroup>
          </select>
        </div>

        <!-- Voice Settings -->
        <div class="voice-settings">
          <h3>{_('revoice.voiceSettings')}</h3>

          <div class="setting">
            <label for={stabilityRangeId}
              >{_('revoice.stability')}
              {stability.toFixed(2)}</label
            >
            <input
              id={stabilityRangeId}
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={stability}
            />
            <small>{_('revoice.stabilityHelp')}</small>
          </div>

          <div class="setting">
            <label for={similarityRangeId}
              >{_('revoice.similarity')}
              {similarityBoost.toFixed(2)}</label
            >
            <input
              id={similarityRangeId}
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={similarityBoost}
            />
            <small>{_('revoice.similarityHelp')}</small>
          </div>

          <div class="setting">
            <label for={styleRangeId}>{_('revoice.style')} {style.toFixed(2)}</label>
            <input id={styleRangeId} type="range" min="0" max="1" step="0.01" bind:value={style} />
            <small>{_('revoice.styleHelp')}</small>
          </div>

          <div class="setting">
            <label class="checkbox-label" for={speakerBoostId}>
              <input id={speakerBoostId} type="checkbox" bind:checked={useSpeakerBoost} />
              {_('revoice.useSpeakerBoost')}
            </label>
          </div>
        </div>

        <!-- Live Preview Status -->
        {#if isPreviewPlaying}
          <div class="preview-status">
            <span class="inline-icon-18px"><MaterialSymbol icon="volume_up" fontSize={18} /></span>
            {_('revoice.playingPreview')}
            <button class="stop-preview-btn" on:click={stopPreview}>{_('revoice.stop')}</button>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="glass-button secondary" on:click={handleClose}>
          {_('revoice.cancel')}
        </button>
        <button
          class="glass-button primary"
          on:click={handleReVoice}
          disabled={!editedText || !selectedVoiceId}
        >
          {_('revoice.generate')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(18px);
  }

  .modal-content {
    max-width: min(600px, 95vw);
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 0;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 24px;
  }

  @media (min-width: 769px) {
    .modal-content {
      width: 600px;
    }
  }

  @media (max-width: 768px) {
    .modal-content {
      width: 95%;
      max-height: 85vh;
    }

    .modal-header {
      padding: 1rem 1rem 0;
    }

    .modal-header h2 {
      font-size: 1.25rem;
    }

    .modal-body {
      padding: 0 1rem 1rem;
    }

    .modal-footer {
      padding: 1rem;
      flex-direction: column;
      gap: 0.5rem;
    }

    .glass-button {
      width: 100%;
    }

    textarea,
    select {
      font-size: 16px;
    }
  }

  @media (max-width: 640px) {
    .modal-content {
      width: 100%;
      max-width: none;
      border-radius: 16px;
      max-height: 100vh;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header h2 {
    margin: 0;
    color: inherit;
  }

  .close-btn {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-24px,
  .icon-32px {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
  }

  .icon-24px {
    width: 24px;
    height: 24px;
  }

  .icon-32px {
    width: 32px;
    height: 32px;
  }

  .inline-icon-18px {
    display: inline-block;
    width: 18px;
    height: 18px;
    vertical-align: middle;
    margin-right: 4px;
  }

  .modal-body {
    padding: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    color: inherit;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .text-editor,
  select {
    width: 100%;
    border-radius: 8px;
    color: inherit;
    font-size: 14px;
  }

  .text-editor {
    padding: 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    resize: vertical;
  }

  select {
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .text-editor:focus,
  select:focus {
    outline: none;
    border-color: rgba(74, 158, 255, 0.5);
  }

  .text-info {
    display: block;
    font-size: 12px;
    margin-top: 4px;
    color: rgba(255, 255, 255, 0.6);
  }

  .voice-settings {
    background: rgba(0, 0, 0, 0.2);
    padding: 16px;
    border-radius: 8px;
  }

  .voice-settings h3 {
    margin: 0 0 16px 0;
    color: inherit;
    font-size: 16px;
  }

  .setting {
    margin-bottom: 16px;
  }

  .setting label {
    display: block;
    color: inherit;
    margin-bottom: 4px;
    font-size: 13px;
  }

  .setting input[type='range'] {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
  }

  .setting small {
    display: block;
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    margin-top: 2px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: inherit;
  }

  .preview-status {
    background: rgba(74, 158, 255, 0.2);
    padding: 12px;
    border-radius: 8px;
    color: inherit;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
  }

  .stop-preview-btn {
    background: rgba(255, 0, 0, 0.3);
    border: 1px solid rgba(255, 0, 0, 0.5);
    color: inherit;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
  }

  .modal-footer {
    padding: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .glass-button {
    padding: 10px 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: inherit;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .glass-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .glass-button.primary {
    background: linear-gradient(135deg, #4a9eff, #7c3aed);
    border-color: #4a9eff;
  }

  .glass-button.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(html.dark) .modal-content {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    backdrop-filter: blur(24px);
    border-radius: 24px;
  }

  :global(html.dark) .text-info,
  :global(html.dark) .setting small {
    color: rgba(255, 255, 255, 0.6);
  }

  :global(html.dark) .setting input[type='range'] {
    background: rgba(255, 255, 255, 0.2);
  }

  :global(html.dark) .stop-preview-btn {
    color: #fff;
  }

  :global(html.light) .modal-content {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: #111;
    backdrop-filter: blur(24px);
    border-radius: 24px;
  }

  :global(html.light) .modal-header {
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  :global(html.light) .modal-header h2 {
    color: #111;
  }

  :global(html.light) .close-btn {
    color: #111;
  }

  :global(html.light) .modal-body {
    color: #111;
  }

  :global(html.light) .modal-content label {
    color: #111;
  }

  :global(html.light) .text-editor,
  :global(html.light) select {
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.12);
    color: #111;
  }

  :global(html.light) .text-editor::placeholder {
    color: rgba(17, 17, 17, 0.5);
  }

  :global(html.light) .modal-content small,
  :global(html.light) .text-info {
    color: rgba(17, 17, 17, 0.5);
  }

  :global(html.light) .voice-settings {
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 8px;
  }

  :global(html.light) .voice-settings h3 {
    color: #111;
  }

  :global(html.light) .setting input[type='range'] {
    background: rgba(0, 0, 0, 0.12);
  }

  :global(html.light) .preview-status {
    background: rgba(74, 158, 255, 0.15);
    color: #111;
  }

  :global(html.light) .stop-preview-btn {
    background: rgba(220, 38, 38, 0.12);
    border: 1px solid rgba(220, 38, 38, 0.4);
    color: #b91c1c;
  }

  :global(html.light) .modal-footer {
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }

  :global(html.light) .glass-button {
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.05);
    color: #111;
  }

  :global(html.light) .glass-button:hover {
    background: rgba(0, 0, 0, 0.08);
  }

  :global(html.light) .glass-button.primary {
    background: linear-gradient(135deg, #dbeafe, #ede9fe);
    border-color: rgba(99, 102, 241, 0.4);
    color: #111;
  }

  :global(html.light) .glass-button.primary:disabled {
    color: rgba(17, 17, 17, 0.6);
  }
</style>
