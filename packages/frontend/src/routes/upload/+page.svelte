<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { videosApi } from '$lib/api/videos';
  import MsqdxProgress from '$lib/components/msqdx-progress.svelte';
  import { get } from 'svelte/store';
  import { currentLocale, _ } from '$lib/i18n';

  let files: FileList | null = null;
  let uploading = false;
  let progress = 0;
  let error: string | null = null;
  let dragOver = false;
  let uploadedVideos: any[] = [];
  let currentFileIndex = 0;
  let totalFiles = 0;

  async function handleUpload() {
    if (!files || files.length === 0) {
      error = _('pages.upload.errorNoFile');
      return;
    }

    // Validate all files
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith('video/')) {
        error = _('pages.upload.errorNotVideo', { name: file.name });
        return;
      }

      if (file.size > maxSize) {
        error = _('pages.upload.errorTooLarge', { name: file.name });
        return;
      }
    }

    uploading = true;
    error = null;
    uploadedVideos = [];
    totalFiles = files.length;

    try {
      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        currentFileIndex = i;
        const file = files[i];

        const response = await videosApi.uploadVideo(file, p => {
          // Calculate overall progress across all files
          const filesCompleted = i;
          const currentFileProgress = p / 100;
          progress = ((filesCompleted + currentFileProgress) / totalFiles) * 100;
        });

        uploadedVideos.push(response.video);
      }

      // Redirect to videos page after all uploads complete
      setTimeout(() => {
        goto(`${base}/videos`);
      }, 1000);
    } catch (err) {
      error = err instanceof Error ? err.message : _('errors.uploadError');
      uploading = false;
      progress = 0;
    }
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    files = target.files;
    error = null;
  }

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

    if (event.dataTransfer?.files) {
      files = event.dataTransfer.files;
      error = null;
    }
  }

  import MsqdxGlassCard from '$lib/components/ui/MsqdxGlassCard.svelte';
  import { MaterialSymbol } from '$lib/components/ui';

  function formatFileSize(bytes: number): string {
    const locale = get(currentLocale);
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<svelte:head>
  <title>{_('pages.upload.title')} - Videon</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8 pb-12">
  <!-- Intro / Title -->
  <!-- <div class="text-center mb-8">
     Title is now in header
  </div> -->

  <MsqdxGlassCard variant="default">
    <!-- Upload Area -->
    <div
      class="relative group cursor-pointer"
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
      role="button"
      tabindex="0"
      on:keydown={e => e.key === 'Enter' && document.getElementById('file-input')?.click()}
      on:click={() => document.getElementById('file-input')?.click()}
    >
      <div
        class="
          border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300
          {dragOver
          ? 'border-white/60 bg-white/10 scale-[1.01]'
          : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
        "
      >
        <div class="flex flex-col items-center justify-center space-y-6">
          <div
            class="mb-2 p-4 rounded-full bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300"
          >
            <MaterialSymbol icon="cloud_upload" fontSize={48} class="text-white/80" />
          </div>

          <div>
            <h3 class="text-xl font-light tracking-wide text-white mb-2">
              {files && files.length > 0
                ? _('pages.upload.fileCountSelected', { count: files.length })
                : _('pages.upload.dragDropTitle')}
            </h3>
            <p class="text-white/60 font-light">
              {_('pages.upload.dragDropSubtitle')}
            </p>
          </div>

          <div class="flex gap-4 text-xs text-white/40 uppercase tracking-widest">
            <span>MP4</span>
            <span>AVI</span>
            <span>MOV</span>
            <span>MKV</span>
          </div>
        </div>
      </div>

      <input
        id="file-input"
        type="file"
        accept="video/*"
        multiple
        bind:files
        on:change={handleFileSelect}
        class="hidden"
      />
    </div>

    <!-- Selected Files Info -->
    {#if files && files.length > 0}
      <div class="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4 pl-1">
          {_('pages.upload.selectedFiles')}
        </h4>
        <div class="space-y-3">
          {#each Array.from(files) as file, index}
            <div
              class="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300"
                >
                  <MaterialSymbol icon="movie" fontSize={20} />
                </div>
                <div>
                  <p class="text-white/90 font-medium text-sm">{file.name}</p>
                  <p class="text-white/50 text-xs mt-0.5">{file.type || 'video/unknown'}</p>
                </div>
              </div>
              <span class="text-white/60 text-sm font-mono">{formatFileSize(file.size)}</span>
            </div>
          {/each}

          <div class="flex justify-end pt-2 text-white/40 text-xs font-mono">
            {_('pages.upload.selectedFile')}
            {formatFileSize(Array.from(files).reduce((sum, f) => sum + f.size, 0))}
          </div>
        </div>
      </div>
    {/if}

    <!-- Error Message -->
    {#if error}
      <div
        class="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
      >
        <MaterialSymbol icon="error" class="text-red-400 mt-0.5" fontSize={20} />
        <p class="text-red-200 text-sm">{error}</p>
      </div>
    {/if}

    <!-- Progress Bar -->
    {#if uploading}
      <div class="mt-8 p-6 bg-black/20 rounded-2xl border border-white/5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-white/80 text-sm font-medium">
            {_('pages.upload.uploadingCount', { current: currentFileIndex + 1, total: totalFiles })}
          </span>
          <span class="text-indigo-400 font-mono text-sm">{Math.round(progress)}%</span>
        </div>
        <MsqdxProgress {progress} />
        <p class="text-white/40 text-xs mt-3 text-center animate-pulse">
          {_('pages.upload.processing')}
        </p>
      </div>
    {/if}

    <!-- Upload Button -->
    {#if files && files.length > 0 && !uploading}
      <div class="mt-8">
        <button
          type="button"
          class="
            w-full py-4 px-6 rounded-xl
            bg-gradient-to-r from-indigo-500 to-purple-600
            hover:from-indigo-400 hover:to-purple-500
            text-white font-semibold tracking-wide text-sm uppercase
            shadow-lg shadow-indigo-500/20
            transform hover:scale-[1.01] active:scale-[0.99]
            transition-all duration-200
            flex items-center justify-center gap-2
          "
          on:click={handleUpload}
          disabled={uploading}
        >
          <MaterialSymbol icon="rocket_launch" fontSize={20} />
          <span>
            {_('pages.upload.startUpload', { count: files.length })}
          </span>
        </button>
      </div>
    {/if}
  </MsqdxGlassCard>

  <!-- Help Section (Subtler) -->
  <div class="px-6 py-4">
    <h3 class="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
      {_('pages.upload.guidelines')}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/50">
      <div class="flex items-start gap-3">
        <MaterialSymbol icon="check_circle" fontSize={18} class="text-white/20 mt-0.5" />
        <span>{_('pages.upload.guidelineSize')}</span>
      </div>
      <div class="flex items-start gap-3">
        <MaterialSymbol icon="check_circle" fontSize={18} class="text-white/20 mt-0.5" />
        <span>{_('pages.upload.guidelineFormats')}</span>
      </div>
      <div class="flex items-start gap-3">
        <MaterialSymbol icon="auto_awesome" fontSize={18} class="text-white/20 mt-0.5" />
        <span>{_('pages.upload.guidelineAnalysis')}</span>
      </div>
    </div>
  </div>
</div>
