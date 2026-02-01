<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Video } from '$lib/api/videos';
  import { _ } from '$lib/i18n';
  import { getVideoUrl } from '$lib/config/environment';
  import { MsqdxChip, MsqdxBaseItemCard, MaterialSymbol } from '$lib/components/ui';
  import MsqdxRadialContextMenu from '$lib/components/msqdx-radial-context-menu.svelte';
  import { base } from '$app/paths';

  export let video: Video;

  const dispatch = createEventDispatcher<{
    select: { id: string };
    delete: Video;
    rename: Video;
    share: Video;
  }>();

  let thumbnailUrl = '';
  let showMenu = false;
  let menuX = 0;
  let menuY = 0;

  function handleMenuToggle(event: CustomEvent<{ x: number; y: number }>) {
    menuX = event.detail.x;
    menuY = event.detail.y;
    showMenu = !showMenu;
  }

  function handleClick() {
    const videoPath = `${base}/videos/${video.id}`;
    if (typeof window !== 'undefined') {
      window.location.href = videoPath;
      return;
    }
    dispatch('select', { id: video.id });
  }

  onMount(() => {
    const videoElement = document.createElement('video');
    videoElement.crossOrigin = 'anonymous';
    videoElement.src = getVideoUrl(video.id);
    videoElement.muted = true;
    videoElement.currentTime = 1;

    videoElement.onloadeddata = () => {
      videoElement.currentTime = 1;
    };
    videoElement.onseeked = () => {
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
  });

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

<MsqdxBaseItemCard
  title={video.originalName}
  subtitle="Video"
  type="video"
  {thumbnailUrl}
  on:click={handleClick}
  on:menuToggle={handleMenuToggle}
>
  <div slot="overlay">
    <MsqdxChip variant="glass" color={getStatusColor(video.status)}>
      {getStatusText(video.status)}
    </MsqdxChip>

    {#if showMenu}
      <MsqdxRadialContextMenu
        x={menuX}
        y={menuY}
        items={[
          {
            label: _('actions.rename'),
            icon: 'edit',
            action: () => dispatch('rename', video),
          },
          {
            label: _('actions.share'),
            icon: 'share',
            action: () => dispatch('share', video),
          },
          {
            label: _('actions.delete'),
            icon: 'delete',
            action: () => dispatch('delete', video),
          },
        ]}
        onClose={() => (showMenu = false)}
      />
    {/if}
  </div>

  <div slot="extra">
    <MsqdxChip variant="glass" color="info">
      <MaterialSymbol icon="schedule" fontSize={12} />
      <span>{formatDuration(video.duration)}</span>
    </MsqdxChip>

    <MsqdxChip variant="glass" color="info">
      <MaterialSymbol icon="storage" fontSize={12} />
      <span>{formatFileSize(video.fileSize)}</span>
    </MsqdxChip>
  </div>
</MsqdxBaseItemCard>
