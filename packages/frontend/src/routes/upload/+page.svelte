<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { videosApi } from '$lib/api/videos';
  import MsqdxProgress from '$lib/components/msqdx-progress.svelte';
  import { get } from 'svelte/store';
  import { currentLocale } from '$lib/i18n';

  let files: FileList | null = null;
  let uploading = false;
  let progress = 0;
  let error: string | null = null;
  let dragOver = false;
  let uploadedVideos: any[] = [];
  let currentFileIndex = 0;
  let totalFiles = 0;

  async function handleUpload() {
    const locale = get(currentLocale);
    
    if (!files || files.length === 0) {
      error = locale === 'en' ? 'Please select at least one video file' : 'Bitte wählen Sie mindestens eine Videodatei aus';
      return;
    }

    // Validate all files
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('video/')) {
        error = locale === 'en' 
          ? `File "${file.name}" is not a video file` 
          : `Datei "${file.name}" ist keine Videodatei`;
        return;
      }

      if (file.size > maxSize) {
        error = locale === 'en' 
          ? `File "${file.name}" is too large (max 10GB)` 
          : `Datei "${file.name}" ist zu groß (max 10GB)`;
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
        
        const response = await videosApi.uploadVideo(file, (p) => {
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
      error = err instanceof Error ? err.message : (locale === 'en' ? 'Upload failed' : 'Upload fehlgeschlagen');
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

  function formatFileSize(bytes: number): string {
    const locale = get(currentLocale);
    if (bytes === 0) return locale === 'en' ? '0 Bytes' : '0 Bytes';
    const k = 1024;
    const sizes = locale === 'en' ? ['Bytes', 'KB', 'MB', 'GB'] : ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<svelte:head>
  <title>{$currentLocale === 'en' ? 'Video Upload' : 'Video Upload'} - PrismVid</title>
  <meta name="description" content={$currentLocale === 'en' ? 'Upload videos for analysis' : 'Videos zur Analyse hochladen'} />
</svelte:head>

<div class="max-w-2xl mx-auto space-y-8">
  <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{$currentLocale === 'en' ? 'Video Upload' : 'Video Upload'}</h1>
    <p class="text-gray-600 dark:text-white/70 text-base">
      {$currentLocale === 'en' ? 'Upload your videos for analysis (up to 10 videos, 10GB each)' : 'Laden Sie Ihre Videos zur Analyse hoch (bis zu 10 Videos, je 10GB)'}
    </p>
  </div>

  <div class="glass-card">
    <!-- Upload Area -->
    <div 
      class="upload-area border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg p-12 text-center transition-colors {dragOver ? 'border-gray-400 dark:border-white/40 bg-gray-50 dark:bg-white/5' : ''}"
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
    >
      <div class="space-y-4">
        <div class="text-6xl text-gray-400 dark:text-white/40">📹</div>
        
        <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {files && files.length > 0 
              ? ($currentLocale === 'en' ? `${files.length} File(s) Selected` : `${files.length} Datei(en) ausgewählt`) 
              : ($currentLocale === 'en' ? 'Drop videos here or click to select' : 'Videos hier ablegen oder klicken zum Auswählen')}
          </h3>
          <p class="text-gray-600 dark:text-white/60">
            {$currentLocale === 'en' ? 'Supported formats: MP4, AVI, MOV, WMV, MKV' : 'Unterstützte Formate: MP4, AVI, MOV, WMV, MKV'}
          </p>
          <p class="text-gray-600 dark:text-white/60 ">
            {$currentLocale === 'en' ? 'Maximum file size: 10GB per file' : 'Maximale Dateigröße: 10GB pro Datei'}
          </p>
          <p class="text-gray-600 dark:text-white/60 text-sm mt-1">
            {$currentLocale === 'en' ? 'You can upload multiple videos at once (max 10)' : 'Sie können mehrere Videos gleichzeitig hochladen (max 10)'}
          </p>
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

        <button
          type="button"
          class="glass-button "
          on:click={() => document.getElementById('file-input')?.click()}
          disabled={uploading}
        >
{$currentLocale === 'en' ? 'Select Video(s)' : 'Video(s) auswählen'}
        </button>
      </div>
    </div>

    <!-- Selected Files Info -->
    {#if files && files.length > 0}
      <div class="mt-6 p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">
          {$currentLocale === 'en' ? `Selected File${files.length > 1 ? 's' : ''}:` : `Ausgewählte Datei${files.length > 1 ? 'en' : ''}:`}
        </h4>
        <div class="space-y-3">
          {#each Array.from(files) as file, index}
            <div class="p-3 bg-white/50 dark:bg-white/10 rounded border border-gray-200 dark:border-white/20">
              <p class="text-gray-700 dark:text-white/80 font-medium">{index + 1}. {file.name}</p>
              <div class="flex gap-4 mt-1 text-sm text-gray-600 dark:text-white/60">
                <span>{formatFileSize(file.size)}</span>
                <span>{file.type || 'video/*'}</span>
              </div>
            </div>
          {/each}
          <div class="mt-2 pt-2 border-t border-gray-200 dark:border-white/20">
            <p class="text-gray-700 dark:text-white/80 font-medium">
              {$currentLocale === 'en' ? 'Total:' : 'Gesamt:'} {files.length} {$currentLocale === 'en' ? 'file(s)' : 'Datei(en)'} - {formatFileSize(Array.from(files).reduce((sum, f) => sum + f.size, 0))}
            </p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Error Message -->
    {#if error}
      <div class="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
        <p class="text-red-200">{error}</p>
      </div>
    {/if}

    <!-- Progress Bar -->
    {#if uploading}
      <div class="mt-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-gray-700 dark:text-white/80">
            {$currentLocale === 'en' 
              ? `Uploading ${currentFileIndex + 1} of ${totalFiles}...` 
              : `Lade ${currentFileIndex + 1} von ${totalFiles} hoch...`}
          </span>
          <span class="text-gray-600 dark:text-white/60">{Math.round(progress)}%</span>
        </div>
        <MsqdxProgress progress={progress} />
        <p class="text-gray-600 dark:text-white/60 mt-2">
          {$currentLocale === 'en' 
            ? `Please wait while your video${totalFiles > 1 ? 's are' : ' is'} being uploaded...` 
            : `Bitte warten Sie, während Ihr${totalFiles > 1 ? 'e Videos werden' : ' Video wird'} hochgeladen wird...`}
        </p>
        {#if uploadedVideos.length > 0}
          <p class="text-green-600 dark:text-green-400 text-sm mt-2">
            ✅ {uploadedVideos.length} {$currentLocale === 'en' ? 'video(s) uploaded successfully' : 'Video(s) erfolgreich hochgeladen'}
          </p>
        {/if}
      </div>
    {/if}

    <!-- Upload Button -->
    {#if files && files.length > 0 && !uploading}
      <div class="mt-6">
        <button
          type="button"
          class="glass-button w-full "
          on:click={handleUpload}
          disabled={uploading}
        >
{$currentLocale === 'en' 
  ? `Upload ${files.length > 1 ? `${files.length} Videos` : 'Video'}` 
  : `${files.length > 1 ? `${files.length} Videos` : 'Video'} hochladen`}
        </button>
      </div>
    {/if}
  </div>

  <!-- Help Section -->
  <div class="glass-card">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">{$currentLocale === 'en' ? 'Help' : 'Hilfe'}</h3>
    <div class="space-y-3 text-gray-600 dark:text-white/70">
      <p>• {$currentLocale === 'en' ? 'Supported video formats: MP4, AVI, MOV, WMV, MKV' : 'Unterstützte Video-Formate: MP4, AVI, MOV, WMV, MKV'}</p>
      <p>• {$currentLocale === 'en' ? 'Maximum file size: 10GB per video' : 'Maximale Dateigröße: 10GB pro Video'}</p>
      <p>• {$currentLocale === 'en' ? 'Upload up to 10 videos at once' : 'Bis zu 10 Videos gleichzeitig hochladen'}</p>
      <p>• {$currentLocale === 'en' ? 'Vision analysis starts automatically after upload' : 'Nach dem Upload startet automatisch die Vision-Analyse'}</p>
      <p>• {$currentLocale === 'en' ? 'Analysis may take several minutes per video' : 'Die Analyse kann einige Minuten pro Video dauern'}</p>
    </div>
  </div>
</div>