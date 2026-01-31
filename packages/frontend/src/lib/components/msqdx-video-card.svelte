<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Video } from '$lib/api/videos';
  import { _ } from '$lib/i18n';
  import { getVideoUrl } from '$lib/config/environment';
  import { MsqdxChip } from '$lib/components/ui';
  import MsqdxCardMenu from '$lib/components/msqdx-card-menu.svelte';
  import { base } from '$app/paths';
  import { MaterialSymbol } from '$lib/components/ui';
  import { MSQDX_TYPOGRAPHY } from '$lib/design-tokens';

  export let video: Video = {} as Video;

  const dispatch = createEventDispatcher<{
    select: { id: string };
    delete: { id: string };
    rename: { id: string };
    share: { id: string };
  }>();

  let thumbnailUrl = '';
  let videoElement: HTMLVideoElement | null = null;

  function handleClick(event?: Event) {
    const videoPath = `${base}/videos/${video.id}`;
    if (typeof window !== 'undefined') {
      window.location.href = videoPath;
      return;
    }
    dispatch('select', { id: video.id });
  }

  // Generate thumbnail from video
  $: if (video && video.id && typeof window !== 'undefined') {
    const currentVideoId = video.id;

    // Clear existing thumbnail when video changes
    thumbnailUrl = '';

    const timer = setTimeout(() => {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.src = getVideoUrl(currentVideoId);
      v.muted = true;
      v.preload = 'metadata';

      const onLoadedMetadata = () => {
        v.currentTime = 1;
      };

      const onSeeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(v, 0, 0);
            thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          }
        } catch (error) {
          // Silent fail
        }
        v.src = '';
        v.load();
      };

      v.addEventListener('loadedmetadata', onLoadedMetadata);
      v.addEventListener('seeked', onSeeked);
      videoElement = v;
    }, 100);
  }

  function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
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
      case 'UPLOADED':
        return _('status.uploaded');
      case 'ANALYZING':
        return _('status.analyzing');
      case 'ANALYZED':
        return _('status.analyzed');
      case 'COMPLETE':
        return _('status.complete');
      case 'ERROR':
        return _('status.error');
      default:
        return _('status.unknown');
    }
  }

  function getStatusColor(status: Video['status']): 'info' | 'warning' | 'success' | 'error' {
    const normalized = status?.toUpperCase?.() ?? 'UNKNOWN';
    switch (normalized) {
      case 'UPLOADED':
        return 'info';
      case 'ANALYZING':
        return 'warning';
      case 'ANALYZED':
      case 'COMPLETE':
        return 'success';
      case 'ERROR':
        return 'error';
      default:
        return 'info';
    }
  }
</script>

{#if video && video.id}
  <div
    class="msqdx-glass-card group overflow-hidden transition-transform duration-200 hover:scale-105 cursor-pointer hoverable no-padding"
    role="button"
    tabindex="0"
    on:click={e => {
      e.stopPropagation();
      handleClick(e);
    }}
    on:keydown={e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    }}
    style="
    --blur: var(--msqdx-glass-blur);
    --opacity: 0.05;
    --border-radius: var(--msqdx-radius-xxl);
    --padding: 0;
    --background-color: var(--msqdx-color-dark-paper);
    --border-color: var(--msqdx-color-brand-orange);
    --border-top-color: var(--msqdx-color-dark-border);
  "
  >
    <div
      class="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 overflow-hidden relative rounded-t-[2.5rem] pointer-events-none"
      style={thumbnailUrl
        ? `background-image: url(${thumbnailUrl}); background-size: cover; background-position: center;`
        : ''}
    >
      <!-- Gradient overlay for better contrast -->
      <div
        class="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 pointer-events-none"
      ></div>

      <!-- Top Right Actions -->
      <MsqdxCardMenu
        items={[
          {
            label: _('actions.rename'),
            icon: 'edit',
            action: () => dispatch('rename', video),
          },
          {
            label: _('actions.share') ?? 'Share',
            icon: 'share',
            action: () => dispatch('share', video),
          },
          {
            label: _('actions.delete'),
            icon: 'delete',
            danger: true,
            action: () => dispatch('delete', video),
          },
        ]}
      />

      <!-- Play Overlay -->
      <div
        class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all duration-200 pointer-events-none"
      >
        <div
          class="w-16 h-16 opacity-60 group-hover:opacity-80 transition-opacity play-icon pointer-events-none flex items-center justify-center"
        >
          <MaterialSymbol icon="play_arrow" fontSize={64} />
        </div>
      </div>

      <!-- Info Chips Overlay (Top Right) -->
      <div class="absolute top-2 right-2 pointer-events-none">
        <div class="flex flex-col items-end gap-2 pointer-events-none">
          <!-- Status Chip -->
          <MsqdxChip variant="glass" color={getStatusColor(video.status)}>
            {getStatusText(video.status)}
          </MsqdxChip>
        </div>
      </div>
    </div>

    <!-- Video Info -->
    <div class="space-y-3 px-4 pt-3 pointer-events-none">
      <h3 class="font-semibold text-lg truncate" title={video.originalName}>
        {video.originalName}
      </h3>

      <!-- Info Chips -->
      <div class="flex flex-wrap gap-2 pb-4 pointer-events-none">
        <MsqdxChip
          variant="glass"
          color="info"
          style="font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};"
        >
          <span class="w-3 h-3 chip-icon flex items-center justify-center"
            ><MaterialSymbol icon="schedule" fontSize={12} /></span
          >
          <span>{formatDuration(video.duration)}</span>
        </MsqdxChip>

        <MsqdxChip
          variant="glass"
          color="info"
          style="font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};"
        >
          <span class="w-3 h-3 chip-icon flex items-center justify-center"
            ><MaterialSymbol icon="storage" fontSize={12} /></span
          >
          <span>{formatFileSize(video.fileSize)}</span>
        </MsqdxChip>
      </div>
    </div>
  </div>
{/if}

<style>
  .msqdx-glass-card {
    position: relative;
    overflow: hidden;
    transition: all var(--msqdx-transition-slow);
    display: flex;
    flex-direction: column;
    border-radius: var(--border-radius);
    padding: var(--padding);
    background-color: var(--background-color);
    backdrop-filter: blur(var(--blur));
    -webkit-backdrop-filter: blur(var(--blur));
    border: 1px solid var(--border-color);
    border-top: 1px solid var(--border-top-color);
    border-left: 1px solid var(--border-top-color);
  }

  /* Force no padding for cards with no-padding class */
  .msqdx-glass-card.no-padding {
    padding: 0 !important;
  }

  /* Force xxl border-radius for video cards */
  .msqdx-glass-card.no-padding {
    border-radius: var(--msqdx-radius-xxl) !important;
  }

  @media (min-width: 768px) {
    .msqdx-glass-card.no-padding {
      border-radius: var(--msqdx-radius-xxl) !important;
      padding: 0 !important;
    }
  }

  .msqdx-glass-card.hoverable {
    cursor: pointer;
  }

  .msqdx-glass-card.hoverable:hover {
    border-color: var(--msqdx-color-brand-orange);
  }

  .play-icon {
    filter: brightness(0) invert(1);
  }

  .chip-icon {
    opacity: 0.8;
  }

  :global(html.dark) .chip-icon {
    filter: brightness(0) invert(1);
  }

  :global(html.light) .chip-icon {
    filter: none !important;
  }
</style>
