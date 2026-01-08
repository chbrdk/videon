<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Video } from '$lib/api/videos';
  import { _ } from '$lib/i18n';
  import { getVideoUrl } from '$lib/config/environment';
  // Import Material Icons as URL for img tags
  import PlayIcon from '@material-icons/svg/svg/play_arrow/baseline.svg';
  import ClockIcon from '@material-icons/svg/svg/schedule/baseline.svg';
  import StorageIcon from '@material-icons/svg/svg/storage/baseline.svg';

  export let video: Video;

  const dispatch = createEventDispatcher<{
    select: Video;
  }>();

  let thumbnailUrl = '';

  function handleClick() {
    dispatch('select', video);
  }

  // Generate thumbnail from video
  onMount(() => {
    const videoElement = document.createElement('video');
    videoElement.crossOrigin = 'anonymous';
    videoElement.src = getVideoUrl(video.id);
    videoElement.muted = true;
    videoElement.currentTime = 1; // Set to 1 second to get a frame

    videoElement.onloadeddata = () => {
      // Seek to 1 second
      videoElement.currentTime = 1;
    };

    videoElement.onseeked = () => {
      // Extract frame as thumbnail
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        }
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
      }
    };

    videoElement.onerror = () => {
      console.error('Failed to load video for thumbnail generation');
    };
  });

  function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return '—';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function getStatusText(status: Video['status']): string {
    const normalized = status?.toUpperCase?.() ?? 'UNKNOWN';
    switch (normalized) {
      case 'UPLOADED': return _('status.uploaded');
      case 'ANALYZING': return _('status.analyzing');
      case 'ANALYZED': return _('status.analyzed');
      case 'COMPLETE': return _('status.complete');
      case 'ERROR': return _('status.error');
      default: return _('status.unknown');
    }
  }

  function getStatusChipClass(status: Video['status']): string {
    const normalized = status?.toUpperCase?.() ?? 'UNKNOWN';
    switch (normalized) {
      case 'UPLOADED': return 'chip chip-info';
      case 'ANALYZING': return 'chip chip-warning';
      case 'ANALYZED':
      case 'COMPLETE': return 'chip chip-success';
      case 'ERROR': return 'chip chip-error';
      default: return 'chip';
    }
  }
</script>

<div 
  class="glass-card-no-padding cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-white/15 group overflow-hidden"
  role="button"
  tabindex="0"
  on:click={handleClick}
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
  <!-- Video Container -->
  <div 
    class="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 overflow-hidden relative rounded-t-[2.5rem]" 
    style="{thumbnailUrl ? `background-image: url(${thumbnailUrl}); background-size: cover; background-position: center;` : ''}"
  >
    <!-- Gradient overlay for better contrast -->
    <div class="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
    
    <!-- Play Overlay -->
    <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all duration-200">
      <img src={PlayIcon} alt="Play" class="w-16 h-16 opacity-60 group-hover:opacity-80 transition-opacity play-icon" />
    </div>

    <!-- Info Chips Overlay (Bottom Right) -->
    <div class="absolute bottom-4 right-4">
      <div class="flex flex-col items-end gap-2">
        <!-- Status Chip -->
        <div class="{getStatusChipClass(video.status)}">
          {getStatusText(video.status)}
        </div>
      </div>
    </div>
  </div>

  <!-- Video Info -->
  <div class="space-y-3">
    <h3 class="font-semibold text-white text-lg truncate px-4 pt-3" title={video.originalName}>
      {video.originalName}
    </h3>

    <!-- Info Chips -->
    <div class="flex flex-wrap gap-2 px-4 pb-4">
      <div class="chip chip-info">
        <img src={ClockIcon} alt="Duration" class="w-3 h-3 chip-icon" />
        <span>{formatDuration(video.duration)}</span>
      </div>
      
      <div class="chip chip-info">
        <img src={StorageIcon} alt="Size" class="w-3 h-3 chip-icon" />
        <span>{formatFileSize(video.fileSize)}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .glass-card-no-padding {
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: all 0.2s;
    padding: 0;
    border-radius: 2.5rem;
  }

  :global(html.dark) .glass-card-no-padding {
    background: rgb(15 23 42 / 55%);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Chip Styling */
  .chip {
    @apply flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm;
    @apply border shadow-md;
  }

  .chip-info {
    @apply bg-blue-500/20 text-blue-200 border-blue-500/30;
  }

  .chip-warning {
    @apply bg-yellow-500/20 text-yellow-200 border-yellow-500/30;
  }

  .chip-success {
    @apply bg-green-500/20 text-green-200 border-green-500/30;
  }

  .chip-error {
    @apply bg-red-500/20 text-red-200 border-red-500/30;
  }

  .chip img {
    @apply opacity-80;
  }

  .chip-icon {
    opacity: 0.8;
  }

  .play-icon {
    filter: brightness(0) invert(1);
  }

  :global(html.dark) .chip-icon {
    filter: brightness(0) invert(1);
  }

  :global(html.light) .chip-icon {
    filter: none !important;
  }
</style>
