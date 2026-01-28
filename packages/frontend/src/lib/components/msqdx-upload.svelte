<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { uploading, uploadProgress, uploadError } from '$lib/stores/videos.store';
  import { MsqdxGlassCard, MsqdxChip, MsqdxProgress } from '$lib/components/ui';
  import UploadIcon from '@material-icons/svg/svg/upload/baseline.svg?raw';
  import VideoIcon from '@material-icons/svg/svg/video_library/baseline.svg?raw';
  import { _ } from '$lib/i18n';

  const dispatch = createEventDispatcher<{
    upload: File;
  }>();

  let dragOver = false;
  let fileInput: HTMLInputElement;

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }

  function handleFileSelect() {
    const files = fileInput.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }

  function handleFile(file: File) {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert(_('errors.selectValidVideo'));
      return;
    }

    // Validate file size (2GB limit)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      alert(_('errors.fileTooLarge'));
      return;
    }

    dispatch('upload', file);
  }

  function formatFileSize(bytes: number): string {
    const sizes = [_('units.bytes'), _('units.kb'), _('units.mb'), _('units.gb')];
    if (bytes === 0) return `0 ${_('units.bytes')}`;
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
</script>

<MsqdxGlassCard class="max-w-2xl mx-auto">
  <div class="text-center mb-6">
    <h2 class="text-2xl font-bold text-gradient mb-2">{_('pages.upload.uploadVideo')}</h2>
    <p class="text-gray-600 dark:text-white/70">{_('pages.upload.dragDropMessage')}</p>
  </div>

  <!-- Upload Area -->
  <div
    class="relative border-2 border-dashed border-gray-300 dark:border-white/30 rounded-xl p-12 transition-all duration-200 cursor-pointer {dragOver ? 'border-gray-400 dark:border-white/60 bg-gray-50 dark:bg-white/10' : 'hover:border-gray-400 dark:hover:border-white/50 hover:bg-gray-50 dark:hover:bg-white/5'}"
    role="button"
    tabindex="0"
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    on:click={() => fileInput.click()}
    on:keydown={(e) => e.key === 'Enter' && fileInput.click()}
  >
    <input
      bind:this={fileInput}
      type="file"
      accept="video/*"
      class="hidden"
      on:change={handleFileSelect}
    />

    <div class="text-center">
      <div class="mx-auto w-16 h-16 mb-4 text-gray-400 dark:text-white/60">{@html UploadIcon}</div>
      <p class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {dragOver ? _('pages.upload.fileSelected') : _('pages.upload.selectFile')}
      </p>
      <p class="text-sm text-gray-600 dark:text-white/60">
        {_('pages.upload.supportedFormats')}
      </p>
    </div>
  </div>

  <!-- Upload Progress -->
  {#if $uploading}
    <div class="mt-6">
      <MsqdxProgress 
        value={$uploadProgress} 
        label={_('pages.upload.uploadProgress')}
        showValue={true}
        color="primary"
        height={8}
      />
    </div>
  {/if}

  <!-- Upload Error -->
  {#if $uploadError}
    <MsqdxChip variant="filled" color="error" class="mt-4 w-full justify-center">
      {_('errors.uploadError')}: {$uploadError}
    </MsqdxChip>
  {/if}
</MsqdxGlassCard>
