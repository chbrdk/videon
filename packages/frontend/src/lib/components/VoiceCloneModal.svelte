<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _, currentLocale } from '$lib/i18n';
  import { voiceSegmentApi } from '$lib/api/voice-segment';
  import type { VoiceSegment, VoiceClone } from '$lib/api/voice-segment';
  import { api } from '$lib/config/environment';
  import { MaterialSymbol } from '$lib/components/ui';

  export let show: boolean = false;
  export let sourceSegment: VoiceSegment | null = null;

  const dispatch = createEventDispatcher();

  let name = '';
  let description = '';
  let audioFile: File | null = null;
  let audioFilePath = '';
  let isCloning = false;

  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      audioFile = input.files[0];
    }
  }

  async function handleClone() {
    if (!name || (!audioFile && !sourceSegment)) {
      alert(_('voiceClone.alertMissing'));
      return;
    }

    isCloning = true;

    try {
      // Upload file if provided
      let uploadedPath = audioFilePath;

      if (audioFile) {
        const formData = new FormData();
        formData.append('audio', audioFile);

        const uploadResponse = await fetch(`${api.baseUrl}/upload-audio`, {
          method: 'POST',
          body: formData,
        });

        const { filePath } = await uploadResponse.json();
        uploadedPath = filePath;
      } else if (sourceSegment) {
        uploadedPath = sourceSegment.originalFilePath;
      }

      await voiceSegmentApi.cloneVoice({
        name,
        audioFilePath: uploadedPath,
        description,
      });

      dispatch('success');
      handleClose();
    } catch (error) {
      console.error('Voice cloning failed:', error);
      alert(_('voiceClone.alertFailed') + (error as Error).message);
    } finally {
      isCloning = false;
    }
  }

  function handleClose() {
    name = '';
    description = '';
    audioFile = null;
    audioFilePath = '';
    dispatch('close');
  }
</script>

{#if show}
  <div
    class="modal-overlay"
    on:click={handleClose}
    role="button"
    tabindex="0"
    on:keydown={e => e.key === 'Escape' && handleClose()}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-content glass-card" on:click|stopPropagation>
      <div class="modal-header">
        <h2 class="flex items-center gap-2">
          <MaterialSymbol icon="mic" fontSize={24} />
          {_('voiceClone.title')}
        </h2>
        <button class="close-btn" on:click={handleClose}>
          <MaterialSymbol icon="close" fontSize={24} />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>{_('voiceClone.name')}</label>
          <input
            type="text"
            bind:value={name}
            placeholder={_('voiceClone.namePlaceholder')}
            required
          />
        </div>

        <div class="form-group">
          <label>{_('voiceClone.description')}</label>
          <textarea bind:value={description} rows="2" placeholder={_('voiceClone.descPlaceholder')}
          ></textarea>
        </div>

        <div class="form-group">
          <label>{_('voiceClone.audioSource')}</label>

          {#if sourceSegment}
            <div class="source-info flex items-center gap-2">
              <MaterialSymbol icon="check_circle" fontSize={20} class="text-green-400" />
              <span>{_('voiceClone.usingSegment')} "{sourceSegment.originalText}"</span>
            </div>
          {:else}
            <input type="file" accept="audio/*" on:change={handleFileUpload} />
            <small>{_('voiceClone.uploadHelp')}</small>
          {/if}
        </div>

        {#if isCloning}
          <div class="cloning-status">
            <div class="spinner"></div>
            {_('voiceClone.cloningStatus')}
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="glass-button secondary" on:click={handleClose}>
          {_('revoice.cancel')}
        </button>
        <button
          class="glass-button primary"
          on:click={handleClone}
          disabled={!name || (!audioFile && !sourceSegment) || isCloning}
        >
          {isCloning ? _('voiceClone.cloningButton') : _('voiceClone.cloneButton')}
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
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    max-width: min(600px, 95vw);
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 0;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
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

    input[type='text'],
    textarea,
    input[type='file'] {
      font-size: 16px;
    }
  }

  @media (max-width: 640px) {
    .modal-content {
      width: 100%;
      max-width: none;
      border-radius: 0;
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
    color: white;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 32px;
    cursor: pointer;
    line-height: 1;
  }

  .modal-body {
    padding: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    color: white;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .form-group input[type='text'],
  .form-group textarea,
  .form-group input[type='file'] {
    width: 100%;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    font-size: 14px;
  }

  .cloning-status {
    background: rgba(255, 165, 0, 0.2);
    padding: 16px;
    border-radius: 8px;
    color: white;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
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

  .source-info {
    background: rgba(0, 255, 0, 0.1);
    padding: 12px;
    border-radius: 8px;
    color: white;
    border: 1px solid rgba(0, 255, 0, 0.3);
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
    color: white;
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
</style>
