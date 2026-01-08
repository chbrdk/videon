<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ReframedVideo } from '$lib/api/saliency';
  import { currentLocale } from '$lib/i18n';
  import { api } from '$lib/config/environment';
  // Import Material Icons as URL for img tags
  import PlayIcon from '@material-icons/svg/svg/play_arrow/baseline.svg';
  import DownloadIcon from '@material-icons/svg/svg/download/baseline.svg';
  import CloseIcon from '@material-icons/svg/svg/close/baseline.svg';
  import DeleteIcon from '@material-icons/svg/svg/delete/baseline.svg';
  import AspectRatioIcon from '@material-icons/svg/svg/aspect_ratio/baseline.svg';
  import AccessTimeIcon from '@material-icons/svg/svg/access_time/baseline.svg';
  import FileSizeIcon from '@material-icons/svg/svg/storage/baseline.svg';

  export let reframedVideo: ReframedVideo;

  const dispatch = createEventDispatcher<{
    play: ReframedVideo;
    download: ReframedVideo;
    delete: ReframedVideo;
  }>();

  let isPlaying = false;
  let videoElement: HTMLVideoElement;
  let thumbnailUrl: string = '';

  function handlePlay() {
    if (videoUrl && isCompleted) {
      isPlaying = true;
    }
  }

  function handleStop() {
    isPlaying = false;
    if (videoElement) {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
  }

  async function handleDownload() {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  }

  function handleDelete(e: Event) {
    e.stopPropagation();
    if (confirm($currentLocale === 'en' ? 'Are you sure you want to delete this reframed video?' : 'Möchten Sie dieses reframed Video wirklich löschen?')) {
      dispatch('delete', reframedVideo);
    }
  }

  function getAspectRatioClass(aspectRatio: string): string {
    const [width, height] = aspectRatio.split(':').map(Number);
    const ratio = height / width;
    
    if (ratio > 1) {
      return 'aspect-[9/16]';
    } else if (ratio < 1) {
      return 'aspect-video';
    } else {
      return 'aspect-square';
    }
  }

  $: aspectRatioClass = getAspectRatioClass(reframedVideo.aspectRatio);
  $: videoUrl = reframedVideo.status === 'COMPLETED' && reframedVideo.outputPath
    ? `${api.baseUrl}/videos/${reframedVideo.videoId}/reframed/${reframedVideo.id}/download`
    : '';
  
  $: isCompleted = reframedVideo.status === 'COMPLETED';

  // Generate thumbnail from video
  async function loadThumbnail() {
    if (!videoUrl || !isCompleted) return;
    
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous'; // Fix for CORS
      video.src = videoUrl;
      video.muted = true;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });
      
      video.currentTime = 1; // Load frame at 1 second
      
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    }
  }

  // Load thumbnail when video URL is available
  $: if (videoUrl && isCompleted && !thumbnailUrl) {
    loadThumbnail();
  }

  function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'PROCESSING': return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
      case 'COMPLETED': return 'bg-green-500/20 text-green-200 border-green-500/30';
      case 'ERROR': return 'bg-red-500/20 text-red-200 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-200 border-gray-500/30';
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case 'PROCESSING': return $currentLocale === 'en' ? 'Processing...' : 'Verarbeitung...';
      case 'COMPLETED': return $currentLocale === 'en' ? 'Completed' : 'Abgeschlossen';
      case 'ERROR': return $currentLocale === 'en' ? 'Error' : 'Fehler';
      default: return 'Unknown';
    }
  }
</script>

<div class="reframed-card">
  <!-- Video Container (No Padding) -->
  <div class="video-container {aspectRatioClass} relative overflow-hidden bg-black rounded-t-lg">
    {#if isPlaying && videoUrl}
      <!-- Video Player (Fullscreen in Container) -->
      <video
        bind:this={videoElement}
        src={videoUrl}
        crossOrigin="anonymous"
        controls
        autoplay
        playsinline
        webkit-playsinline
        class="absolute inset-0 w-full h-full object-cover"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
      
      <!-- Close Button (Top Right) -->
      <button
        on:click={handleStop}
        class="glass-button absolute top-2 right-2 z-20"
        title={$currentLocale === 'en' ? 'Close Player' : 'Player schließen'}
      >
        <img src={CloseIcon} alt="Close" class="w-5 h-5" />
      </button>
      
      <!-- Delete Button (Top Left) -->
      <button
        on:click={handleDelete}
        class="glass-button glass-button-red absolute top-2 left-2 z-20"
        title={$currentLocale === 'en' ? 'Delete Video' : 'Video löschen'}
      >
        <img src={DeleteIcon} alt="Delete" class="w-5 h-5" />
      </button>
      
      <!-- Download Button (Top Right, below close) -->
      <button
        on:click={handleDownload}
        class="glass-button glass-button-blue absolute top-14 right-2 z-20"
        title={$currentLocale === 'en' ? 'Download Video' : 'Video herunterladen'}
      >
        <img src={DownloadIcon} alt="Download" class="w-5 h-5" />
      </button>
      
    {:else if isCompleted && thumbnailUrl}
      <!-- Thumbnail with Play Button (No Padding) -->
      <img
        src={thumbnailUrl}
        alt="Thumbnail"
        class="absolute inset-0 w-full h-full object-cover"
      />
      
      <!-- Play Overlay Button (Centered) -->
      <button
        on:click={handlePlay}
        class="absolute inset-0 w-full h-full flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all duration-200 cursor-pointer"
      >
        <img src={PlayIcon} alt="Play" class="play-icon w-20 h-20 opacity-80 hover:opacity-100 transition-opacity" />
      </button>
      
      <!-- Delete Button (Top Left) -->
      <button
        on:click={handleDelete}
        class="glass-button glass-button-red absolute top-2 left-2 z-20"
        title={$currentLocale === 'en' ? 'Delete Video' : 'Video löschen'}
      >
        <img src={DeleteIcon} alt="Delete" class="w-5 h-5" />
      </button>
      
      <!-- Download Button (Top Right) -->
      <button
        on:click={handleDownload}
        class="glass-button glass-button-blue absolute top-2 right-2 z-20"
        title={$currentLocale === 'en' ? 'Download Video' : 'Video herunterladen'}
      >
        <img src={DownloadIcon} alt="Download" class="w-5 h-5" />
      </button>
      
      <!-- Info Overlay (Bottom Right) with all Chips stacked -->
      <div class="absolute bottom-4 right-4">
        <div class="flex flex-col items-end gap-2">
          <!-- Status Chip -->
          <div class="status-chip-mini" class:bg-yellow-500={reframedVideo.status === 'PROCESSING'} class:bg-green-500={reframedVideo.status === 'COMPLETED'} class:bg-red-500={reframedVideo.status === 'ERROR'}>
            {getStatusText(reframedVideo.status)}
          </div>
          
          <!-- Saliency Analysis Info -->
          {#if reframedVideo.saliencyAnalysis}
            <div class="info-chip">
              <span>Saliency: {reframedVideo.saliencyAnalysis.frameCount} frames</span>
            </div>
          {/if}
          
          <!-- Info Chips -->
          <div class="info-chip">
            <img src={AspectRatioIcon} alt="Aspect Ratio" class="w-4 h-4" />
            <span>{reframedVideo.aspectRatio}</span>
          </div>
          <div class="info-chip">
            <img src={AccessTimeIcon} alt="Duration" class="w-4 h-4" />
            <span>{formatDuration(reframedVideo.duration)}</span>
          </div>
          <div class="info-chip">
            <img src={FileSizeIcon} alt="File Size" class="w-4 h-4" />
            <span>{formatFileSize(reframedVideo.fileSize)}</span>
          </div>
        </div>
      </div>
      
    {:else if isCompleted}
      <!-- Fallback: Dark Background with Play Button -->
      <div class="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
        <button
          on:click={handlePlay}
          class="flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all duration-200 cursor-pointer p-8 rounded-full"
        >
          <img src={PlayIcon} alt="Play" class="play-icon w-16 h-16 opacity-60 hover:opacity-80 transition-opacity" />
        </button>
      </div>
      
      <!-- Info -->
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-xs">
        <div class="flex items-center justify-between">
          <span>{formatDuration(reframedVideo.duration)}</span>
          <span>{reframedVideo.aspectRatio}</span>
          <span>{formatFileSize(reframedVideo.fileSize)}</span>
        </div>
      </div>
    {:else}
      <!-- Processing State -->
      <div class="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
        <div class="w-12 h-12 text-white/60">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
        
        <!-- Progress Overlay -->
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div class="h-full bg-blue-500 transition-all duration-300" style="width: {reframedVideo.progress * 100}%"></div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .reframed-card {
    @apply bg-white/5 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden transition-all duration-200;
  }
  
  .video-container {
    @apply w-full;
  }
  
  /* Remove any default padding from card */
  .reframed-card > * {
    @apply p-0 m-0;
  }
  
  /* Glass Button Styling */
  .glass-button {
    @apply bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full p-2 transition-all duration-200;
  }
  
  .glass-button img {
    filter: brightness(0) invert(1);
  }
  
  .glass-button-red {
    @apply hover:bg-red-500/30 border-red-500/30;
  }
  
  .glass-button-blue {
    @apply hover:bg-blue-500/30 border-blue-500/30;
  }
  
  /* Status Chip */
  .status-chip {
    @apply absolute top-2 right-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm z-20;
    @apply bg-white/30 text-white border border-white/20;
    @apply shadow-lg;
  }
  
  /* Status Chip Mini (in info overlay) */
  .status-chip-mini {
    @apply px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm;
    @apply bg-white/30 text-white border border-white/20;
    @apply shadow-md;
  }
  
  .status-chip-mini.bg-yellow-500 {
    @apply bg-yellow-500/50 text-yellow-100 border-yellow-400/50;
  }
  
  .status-chip-mini.bg-green-500 {
    @apply bg-green-500/50 text-green-100 border-green-400/50;
  }
  
  .status-chip-mini.bg-red-500 {
    @apply bg-red-500/50 text-red-100 border-red-400/50;
  }
  
  /* Info Chips */
  .info-chip {
    @apply flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm;
    @apply bg-white/30 text-white border border-white/20;
    @apply shadow-md;
  }
  
  .info-chip img {
    @apply opacity-80;
    filter: brightness(0) invert(1);
  }
  
  /* Play Button Icons */
  .play-icon {
    filter: brightness(0) invert(1);
  }
</style>
