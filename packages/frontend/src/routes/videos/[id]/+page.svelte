<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base, resolve } from '$app/paths';
  import {
    selectedVideo,
    videoScenes,
    loadVideoDetails,
    refreshVideo,
  } from '$lib/stores/videos.store';
  import { videosApi } from '$lib/api/videos';
  import { saliencyApi } from '$lib/api/saliency';
  import { currentLocale, _ } from '$lib/i18n';
  import { api } from '$lib/config/environment';
  import {
    showAudioTracks,
    updateAudioClipsWithScenes,
    loadAudioStems,
  } from '$lib/stores/timeline.store';
  import logger from '$lib/utils/logger';
  import MsqdxVisionTags from '$lib/components/msqdx-vision-tags.svelte';
  import MsqdxVideoPlayerWrapper from '$lib/components/msqdx-video-player-wrapper.svelte';
  import MsqdxDeleteModal from '$lib/components/msqdx-delete-modal.svelte';
  import ReframeModal from '$lib/components/ReframeModal.svelte';
  import ReframedVideoCard from '$lib/components/ReframedVideoCard.svelte';
  import MsqdxButton from '$lib/components/ui/MsqdxButton.svelte';
  import MsqdxTypography from '$lib/components/ui/MsqdxTypography.svelte';
  import MsqdxShareDialog from '$lib/components/sharing/MsqdxShareDialog.svelte';
  import type { ReframedVideo, ReframeOptions } from '$lib/api/saliency';
  import { MaterialSymbol } from '$lib/components/ui';

  let audioTracks: any[] = [];
  let refreshing = false;
  let visionData: any = null;
  let loadingVision = false;
  let videoNotFound = false;
  let transcriptionData: any = null;
  let loadingTranscription = false;
  let exporting = false;
  let currentExportFormat: 'premiere' | 'fcpxml' | 'srt' | null = null;
  let deleteModalOpen = false;
  let separatingAudio = false;
  let separatingSpleeter = false;
  let analyzingSaliency = false;
  let saliencyAnalyzed = false;
  let saliencyStatus: any = null;
  let reframingVideo = false;
  let reframingProgress = 0;
  let showReframeModal = false;
  let currentReframingJobId: string | null = null;
  let reframedVideos: ReframedVideo[] = [];
  let loadingReframedVideos = false;
  let qwenVLStatus: any = null;
  let qwenVLProgress = 0;
  let analyzingQwenVL = false;

  // Dropdown states
  let servicesOpen = false;
  let exportOpen = false;
  let shareDialogOpen = false;

  // Delete button hover state
  let deleteButtonHovered = false;

  $: videoId = $page.params.id;

  // Close dropdowns when clicking outside
  function handleClickOutside(event: MouseEvent) {
    servicesOpen = false;
    exportOpen = false;
  }

  onMount(async () => {
    const currentVideoId = $page.params.id;
    if (currentVideoId) {
      logger.info('Loading video details', { videoId: currentVideoId });
      try {
        const videoDetails = await loadVideoDetails(currentVideoId);
        logger.info('Video details loaded successfully', {
          videoId: currentVideoId,
          filename: videoDetails?.filename,
        });
        await loadVisionData();
        logger.info('Vision data loaded successfully', { videoId: currentVideoId });
        await loadTranscription();
        logger.info('Transcription data loaded successfully', { videoId: currentVideoId });
        await loadAudioStems(currentVideoId);
        logger.info('Audio stems loaded successfully', { videoId: currentVideoId });
        await loadReframedVideos();
        logger.info('Reframed videos loaded successfully', { videoId: currentVideoId });
        await loadSaliencyStatus();
        logger.info('Saliency status loaded successfully', { videoId: currentVideoId });
        // Load Qwen VL status if available
        await loadQwenVLStatus();
      } catch (error: any) {
        logger.error('Failed to load video details', {
          videoId: currentVideoId,
          error: error?.message,
        });
        logger.error('Error details', {
          videoId: currentVideoId,
          error: error?.message || 'Unknown error',
        });
        videoNotFound = true;
      }
    }
  });

  async function loadQwenVLStatus() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    try {
      const response = await fetch(`${api.baseUrl}/videos/${currentVideoId}/qwenVL/status`);
      if (response.ok) {
        const status = await response.json();
        qwenVLStatus = status;
        qwenVLProgress = status.progress || 0;
      } else if (response.status === 404 || response.status === 503) {
        // Service not available or not found - this is expected if Qwen VL is not running
        qwenVLStatus = null;
      }
    } catch (error) {
      // Silently fail - Qwen VL service might not be running
      qwenVLStatus = null;
    }
  }

  // Reactive statement to update audio clips when scenes are loaded
  $: if ($videoScenes && $videoScenes.length > 0) {
    console.log('🎵 Scenes loaded, updating audio clips with scene data:', $videoScenes.length);
    updateAudioClipsWithScenes($videoScenes);
  }

  async function loadVisionData() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    logger.info('Loading vision data', { videoId: currentVideoId });
    loadingVision = true;
    try {
      const response = await fetch(`${api.baseUrl}/videos/${currentVideoId}/vision`);
      if (response.ok) {
        visionData = await response.json();
        logger.info('Vision data loaded successfully', {
          videoId: currentVideoId,
          sceneCount: visionData?.length,
        });
      }
    } catch (error: any) {
      logger.error('Failed to load vision data', {
        videoId: currentVideoId,
        error: error?.message,
      });
    } finally {
      loadingVision = false;
    }
  }

  async function handleRefresh() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    refreshing = true;
    try {
      await refreshVideo(currentVideoId);
      await loadVisionData();
      await loadTranscription();
    } finally {
      refreshing = false;
    }
  }

  async function loadTranscription() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    console.log('🔍 Loading transcription for video:', currentVideoId);
    loadingTranscription = true;
    try {
      const response = await fetch(`${api.baseUrl}/videos/${currentVideoId}/transcription`);
      if (response.ok) {
        transcriptionData = await response.json();
      } else if (response.status === 404) {
        transcriptionData = null;
      }
    } catch (error) {
      console.error('❌ Failed to load transcription:', error);
    } finally {
      loadingTranscription = false;
    }
  }

  async function triggerTranscription() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    logger.info('Triggering transcription', { videoId: currentVideoId });
    try {
      const response = await fetch(`${api.baseUrl}/videos/${currentVideoId}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        logger.info('Transcription triggered successfully', { videoId: currentVideoId });
        setTimeout(async () => {
          await loadTranscription();
        }, 2000);
      }
    } catch (error: any) {
      logger.error('Error triggering transcription', {
        videoId: currentVideoId,
        error: error?.message,
      });
    }
  }

  async function triggerAudioSeparation() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    logger.info('Triggering audio separation', { videoId: currentVideoId });
    separatingAudio = true;
    try {
      await videosApi.separateAudio(currentVideoId);
      await pollAudioSeparationStatus();
    } catch (error: any) {
      logger.error('Failed to trigger audio separation', {
        videoId: currentVideoId,
        error: error?.message,
      });
    } finally {
      separatingAudio = false;
    }
  }

  async function triggerSpleeterSeparation() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    logger.info('Triggering Spleeter audio separation', { videoId: currentVideoId });
    separatingSpleeter = true;
    try {
      await videosApi.spleeterSeparateAudio(currentVideoId);
      await pollAudioSeparationStatus();
    } catch (error: any) {
      logger.error('Failed to trigger Spleeter audio separation', {
        videoId: currentVideoId,
        error: error?.message,
      });
    } finally {
      separatingSpleeter = false;
    }
  }

  async function pollAudioSeparationStatus() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      try {
        const status = await videosApi.getAudioSeparationStatus(currentVideoId);
        if (status.status === 'completed') {
          await loadAudioStems(currentVideoId);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        }
      }
    };

    poll();
  }

  async function triggerSaliencyAnalysis() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    logger.info('Triggering saliency analysis', { videoId: currentVideoId });
    analyzingSaliency = true;
    try {
      await saliencyApi.analyzeSaliency(currentVideoId);
      await pollSaliencyStatus();
      await loadSaliencyStatus();
    } catch (error: any) {
      logger.error('Failed to trigger saliency analysis', {
        videoId: currentVideoId,
        error: error?.message,
      });
      alert(
        _('project.error.saliencyStart', {
          message: error?.message || 'Failed to start saliency analysis.',
        })
      );
    } finally {
      analyzingSaliency = false;
    }
  }

  async function pollSaliencyStatus() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      try {
        const status = await saliencyApi.getSaliencyStatus(currentVideoId);
        if (status.hasAnalysis) {
          saliencyAnalyzed = true;
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('❌ Error polling saliency status:', error);
      }
    };

    poll();
  }

  function openReframeModal() {
    showReframeModal = true;
  }

  async function handlePlayReframed(reframedVideo: ReframedVideo) {
    if (reframedVideo.status !== 'COMPLETED') return;
    const videoUrl = `${api.baseUrl}/videos/${reframedVideo.videoId}/reframed/${reframedVideo.id}/download`;
    window.open(videoUrl, '_blank');
  }

  async function handleDownloadReframed(reframedVideo: ReframedVideo) {
    if (reframedVideo.status !== 'COMPLETED') return;
    const videoUrl = `${api.baseUrl}/videos/${reframedVideo.videoId}/reframed/${reframedVideo.id}/download`;
    window.open(videoUrl, '_blank');
  }

  async function handleDeleteReframed(reframedVideo: ReframedVideo) {
    try {
      await saliencyApi.deleteReframedVideo(reframedVideo.id);
      await loadReframedVideos();
    } catch (error) {
      alert(_('reframe.deleteFailed'));
    }
  }

  async function handleReframe(event: CustomEvent<ReframeOptions>) {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    const options = event.detail;
    reframingVideo = true;
    try {
      const response = await saliencyApi.reframeVideo(currentVideoId, options);
      currentReframingJobId = response.jobId;
      await pollReframingStatus(response.jobId);
    } catch (error) {
      reframingVideo = false;
    }
  }

  async function pollReframingStatus(jobId: string) {
    let attempts = 0;
    const maxAttempts = 120;

    const poll = async () => {
      try {
        const status = await saliencyApi.getReframingStatus(jobId);
        reframingProgress = status.progress;

        if (status.completed) {
          reframingVideo = false;
          showReframeModal = false;
          await loadReframedVideos();
          await saliencyApi.downloadReframedVideo(jobId);
          return;
        }

        if (status.status === 'ERROR') {
          reframingVideo = false;
          showReframeModal = false;
          alert('Reframing failed: ' + (status.message || 'Unknown error'));
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('❌ Error polling reframing status:', error);
      }
    };

    poll();
  }

  async function loadSaliencyStatus() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    try {
      saliencyStatus = await saliencyApi.getSaliencyStatus(currentVideoId);
      saliencyAnalyzed = saliencyStatus && saliencyStatus.hasAnalysis;
    } catch (error) {
      saliencyStatus = null;
      saliencyAnalyzed = false;
    }
  }

  async function loadReframedVideos() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    loadingReframedVideos = true;
    try {
      const videos = await saliencyApi.getReframedVideos(currentVideoId);
      reframedVideos = videos;
    } catch (error) {
      reframedVideos = [];
    } finally {
      loadingReframedVideos = false;
    }
  }

  function registerAudioTrack(track: any) {
    audioTracks.push(track);
  }

  function unregisterAudioTrack(track: any) {
    audioTracks = audioTracks.filter(t => t !== track);
  }

  async function triggerVisionAnalysis() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    try {
      const response = await fetch(`${api.baseUrl}/videos/${currentVideoId}/vision/analyze`, {
        method: 'POST',
      });
      if (response.ok) {
        await loadVisionData();
      }
    } catch (error) {
      console.error('Error triggering vision analysis:', error);
    }
  }

  async function triggerQwenVLAnalysis() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    analyzingQwenVL = true;
    try {
      const response = await fetch(`${api.baseUrl}/videos/${currentVideoId}/qwenVL/analyze`, {
        method: 'POST',
      });
      if (response.ok) {
        await pollQwenVLStatus();
      } else {
        alert(_('project.error.qwenUnavailable', { error: 'Service error' }));
      }
    } catch (error: any) {
      alert(_('project.error.qwenUnavailable', { error: error?.message }));
    } finally {
      analyzingQwenVL = false;
    }
  }

  async function pollQwenVLStatus() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    let attempts = 0;
    const maxAttempts = 300;

    const poll = async () => {
      try {
        const response = await fetch(`${api.baseUrl}/videos/${currentVideoId}/qwenVL/status`);
        const status = await response.json();
        qwenVLStatus = status;
        qwenVLProgress = status.progress || 0;

        if (status.isComplete || status.status === 'COMPLETED') {
          analyzingQwenVL = false;
          await loadVisionData();
          await loadQwenVLStatus();
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      }
    };

    poll();
  }

  async function triggerFullAnalysis() {
    const currentVideoId = $page.params.id;
    if (!currentVideoId) return;

    logger.info('Triggering full video analysis', { videoId: currentVideoId });
    try {
      await videosApi.analyzeFull(currentVideoId);

      // Start polling for all services
      pollAudioSeparationStatus();
      pollSaliencyStatus();
      analyzingQwenVL = true;
      pollQwenVLStatus();

      // Refresh video status periodically
      const interval = setInterval(async () => {
        await refreshVideo(currentVideoId);
        if ($selectedVideo.status === 'ANALYZED' || $selectedVideo.status === 'ERROR') {
          clearInterval(interval);
          await loadVisionData();
          await loadTranscription();
          await loadSaliencyStatus();
          await loadAudioStems(currentVideoId);
        }
      }, 5000);
    } catch (error: any) {
      logger.error('Failed to trigger full analysis', {
        videoId: currentVideoId,
        error: error?.message,
      });
      alert('Analysis trigger failed: ' + (error?.message || 'Unknown error'));
    }
  }

  async function handleExport(format: 'premiere' | 'fcpxml' | 'srt') {
    if (!videoId || exporting) return;

    exporting = true;
    currentExportFormat = format;

    try {
      console.log(`🎬 Starting ${format} export for video:`, videoId);

      const endpoint =
        format === 'srt'
          ? `${api.baseUrl}/videos/${videoId}/export/srt`
          : `${api.baseUrl}/videos/${videoId}/export/${format}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      // Get the blob data
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Set filename based on format
      const filename =
        format === 'srt' ? `subtitles_${videoId}.srt` : `${format}_export_${videoId}.zip`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ ${format} export completed and downloaded`);
    } catch (error: any) {
      console.error(`❌ ${format} export failed:`, error);
      alert(`${_('export.exportFailed')}: ${error?.message || _('export.unknownError')}`);
    } finally {
      exporting = false;
      currentExportFormat = null;
    }
  }

  async function handleExportXMLOnly(format: 'premiere' | 'fcpxml') {
    if (!videoId || exporting) return;

    exporting = true;
    currentExportFormat = null;

    try {
      console.log(`📄 Starting XML-only export for video:`, videoId);

      const endpoint = `${api.baseUrl}/videos/${videoId}/export/${format}/xml`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      // Get the blob data
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${format}_export_${videoId}.xml`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ XML export completed successfully');
    } catch (error: any) {
      console.error('❌ XML export failed:', error);
      alert(`${_('export.xmlExportFailed')}: ${error?.message || _('export.unknownError')}`);
    } finally {
      exporting = false;
      currentExportFormat = null;
    }
  }

  function formatDuration(seconds: number | undefined): string {
    if (seconds === undefined || isNaN(seconds)) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  function formatBytes(bytes: number | undefined): string {
    if (bytes === undefined || isNaN(bytes)) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDateTime(isoString: string | undefined): string {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString();
  }

  async function handleDeleteConfirm() {
    if (!videoId) return;

    try {
      await videosApi.deleteVideo(videoId);
      // Navigate back to video list
      goto(`${base}/videos`);
    } catch (error: any) {
      alert(`${_('delete.deleteError')}: ${error?.message || _('export.unknownError')}`);
      deleteModalOpen = false;
    }
  }

  function getStatusChipClass(status: string): string {
    const normalized = status?.toUpperCase?.() ?? 'UNKNOWN';
    switch (normalized) {
      case 'UPLOADED':
        return 'chip chip-primary';
      case 'ANALYZING':
        return 'chip chip-warning';
      case 'ANALYZED':
      case 'COMPLETE':
        return 'chip chip-success';
      case 'ERROR':
        return 'chip chip-error';
      default:
        return 'chip chip-default';
    }
  }

  function getStatusText(status: string): string {
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
</script>

<svelte:head>
  <title>Video - MSQ DX - VIDEON</title>
</svelte:head>

{#if $selectedVideo && !videoNotFound}
  <div class="w-full px-4 space-y-8">
    <!-- Video Info Header -->
    <div class="mb-6">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1"></div>
        <div class="text-right">
          <h2 class="text-xl font-bold text-white">{$selectedVideo.originalName}</h2>
          <p class="text-white/70 text-xs">ID: {$selectedVideo.id}</p>
          <div class="flex flex-wrap gap-2 mt-2 justify-end">
            <span class={getStatusChipClass($selectedVideo.status)}>
              <MaterialSymbol icon="check_circle" fontSize={18} class="inline-block" />
              {getStatusText($selectedVideo.status)}
            </span>
            <span class="chip chip-info">
              <MaterialSymbol icon="storage" fontSize={18} class="inline-block" />
              {formatBytes($selectedVideo.fileSize)}
            </span>
            <span class="chip chip-success">
              <MaterialSymbol icon="schedule" fontSize={18} class="inline-block" />
              {formatDuration($selectedVideo.duration)}
            </span>
            {#if saliencyStatus && saliencyStatus.hasAnalysis}
              <span class="chip chip-success">
                <MaterialSymbol icon="analytics" fontSize={18} class="inline-block" />
                {saliencyStatus.latestAnalysis?.frameCount}
                {_('videoDetails.frames')}
              </span>
            {/if}
            {#if qwenVLStatus}
              {#if qwenVLStatus.status === 'ANALYZING' || (!qwenVLStatus.isComplete && qwenVLStatus.analyzedScenes < qwenVLStatus.totalScenes)}
                <span class="chip chip-warning">
                  <div
                    class="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-1"
                  ></div>
                  <span class="icon-18px"><MaterialSymbol icon="analytics" fontSize={18} /></span>
                  Qwen VL: {qwenVLStatus.analyzedScenes || 0}/{qwenVLStatus.totalScenes || 0} ({qwenVLProgress}%)
                </span>
              {:else if qwenVLStatus.isComplete && visionData}
                {@const qwenVLCount = visionData.filter(s => s.qwenVLProcessed).length}
                {#if qwenVLCount > 0}
                  <span class="chip chip-success">
                    <span class="icon-18px"><MaterialSymbol icon="analytics" fontSize={18} /></span>
                    Qwen VL: {qwenVLCount}
                    {qwenVLCount === 1
                      ? $currentLocale === 'en'
                        ? 'scene'
                        : 'Szene'
                      : $currentLocale === 'en'
                        ? 'scenes'
                        : 'Szenen'}
                  </span>
                {/if}
              {/if}
            {/if}
          </div>
          <p class="text-white/60 text-xs mt-2">
            {_('videoDetails.uploaded')}: {formatDateTime($selectedVideo.uploadedAt)}
          </p>
          {#if $selectedVideo.analyzedAt}
            <p class="text-white/60 text-xs">
              {_('videoDetails.analyzed')}: {formatDateTime($selectedVideo.analyzedAt)}
            </p>
          {/if}
        </div>
      </div>
      <div class="flex gap-2 flex-wrap responsive-button-group">
        <!-- Services Dropdown -->
        <div class="relative">
          <MsqdxButton
            glass={true}
            on:click={() => (servicesOpen = !servicesOpen)}
            class="flex items-center gap-2"
          >
            <MaterialSymbol icon="play_arrow" fontSize={18} />
            <MsqdxTypography variant="body2" weight="medium">Services</MsqdxTypography>
            <MaterialSymbol icon={servicesOpen ? 'expand_less' : 'expand_more'} fontSize={18} />
          </MsqdxButton>

          {#if servicesOpen}
            <div class="dropdown-menu">
              <button
                on:click={() => {
                  handleRefresh();
                  servicesOpen = false;
                }}
                class="dropdown-item"
                disabled={refreshing}
              >
                {#if refreshing}
                  <div class="spinner-small"></div>
                {:else}
                  <MaterialSymbol icon="refresh" fontSize={16} />
                {/if}
                <span class="dropdown-item-text"
                  >{refreshing ? _('videoDetails.refreshing') : _('videoDetails.refresh')}</span
                >
              </button>

              <button
                on:click={() => {
                  triggerFullAnalysis();
                  servicesOpen = false;
                }}
                class="dropdown-item"
                disabled={$selectedVideo.status === 'ANALYZING' || analyzingQwenVL}
              >
                {#if $selectedVideo.status === 'ANALYZING' || analyzingQwenVL}
                  <div class="spinner-small"></div>
                  <span class="dropdown-item-text"
                    >{$currentLocale === 'en' ? 'Analyzing...' : 'Analysiere...'}</span
                  >
                {:else}
                  <MaterialSymbol icon="analytics" fontSize={16} />
                  <span class="dropdown-item-text"
                    >{$currentLocale === 'en' ? 'Full Analysis' : 'Vollständige Analyse'}</span
                  >
                {/if}
              </button>

              {#if saliencyAnalyzed}
                <div class="dropdown-divider"></div>
                <button
                  on:click={() => {
                    openReframeModal();
                    servicesOpen = false;
                  }}
                  class="dropdown-item"
                  disabled={reframingVideo}
                >
                  <MaterialSymbol icon="movie" fontSize={16} />
                  <span class="dropdown-item-text"
                    >{$currentLocale === 'en' ? 'Reframe Video' : 'Video reframen'}</span
                  >
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Export Dropdown -->
        <div class="relative">
          <MsqdxButton
            glass={true}
            on:click={() => (exportOpen = !exportOpen)}
            class="flex items-center gap-2"
          >
            <MaterialSymbol icon="video_file" fontSize={18} />
            <MsqdxTypography variant="body2" weight="medium">Export</MsqdxTypography>
            <MaterialSymbol icon={exportOpen ? 'expand_less' : 'expand_more'} fontSize={18} />
          </MsqdxButton>

          {#if exportOpen}
            <div class="dropdown-menu">
              <button
                on:click={() => {
                  handleExport('premiere');
                  exportOpen = false;
                }}
                class="dropdown-item"
                disabled={exporting}
              >
                {#if exporting && currentExportFormat === 'premiere'}
                  <div class="spinner-small"></div>
                {:else}
                  <MaterialSymbol icon="video_file" fontSize={16} />
                {/if}
                <span class="dropdown-item-text"
                  >{$currentLocale === 'en' ? 'Export Premiere' : 'Export Premiere'}</span
                >
              </button>
              <button
                on:click={() => {
                  handleExportXMLOnly('premiere');
                  exportOpen = false;
                }}
                class="dropdown-item"
                disabled={exporting}
              >
                {#if exporting && currentExportFormat === null}
                  <div class="spinner-small"></div>
                {:else}
                  <MaterialSymbol icon="code" fontSize={16} />
                {/if}
                <span class="dropdown-item-text"
                  >{$currentLocale === 'en' ? 'XML Only' : 'Nur XML'}</span
                >
              </button>
              {#if transcriptionData}
                <button
                  on:click={() => {
                    handleExport('srt');
                    exportOpen = false;
                  }}
                  class="dropdown-item"
                  disabled={exporting}
                >
                  {#if exporting && currentExportFormat === 'srt'}
                    <div class="spinner-small"></div>
                  {:else}
                    <MaterialSymbol icon="subtitles" fontSize={16} />
                  {/if}
                  <span class="dropdown-item-text">{$currentLocale === 'en' ? 'SRT' : 'SRT'}</span>
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Delete Button -->
        <MsqdxButton
          glass={true}
          on:click={() => (deleteModalOpen = true)}
          on:mouseenter={() => (deleteButtonHovered = true)}
          on:mouseleave={() => (deleteButtonHovered = false)}
          class="flex items-center gap-2 delete-button"
          title={$currentLocale === 'en' ? 'Delete Video' : 'Video löschen'}
        >
          <MaterialSymbol icon="delete" fontSize={18} />
          <MsqdxTypography variant="body2" weight="medium">
            {$currentLocale === 'en' ? 'Delete' : 'Löschen'}
          </MsqdxTypography>
        </MsqdxButton>
      </div>
    </div>

    <!-- Video Player + Timeline Wrapper -->
    {#if visionData && visionData.length > 0}
      <MsqdxVideoPlayerWrapper
        videoSrc={videosApi.getVideoUrl($selectedVideo.id)}
        posterSrc=""
        scenes={visionData}
        transcriptionSegments={transcriptionData ? JSON.parse(transcriptionData.segments) : []}
        videoDuration={$selectedVideo?.duration || 0}
        originalVideoDuration={$selectedVideo?.duration || 0}
        videoId={$page.params.id || ''}
        isProject={false}
        showVideoControls={true}
        videoLabel={$currentLocale === 'en' ? 'Original Video' : 'Original Video'}
        on:seekTo={e => {
          // Seek handling is now managed by the wrapper component
        }}
        on:share={() => (shareDialogOpen = true)}
        on:audioTrackRegister={e => registerAudioTrack(e.detail)}
        on:audioTrackUnregister={e => unregisterAudioTrack(e.detail)}
      />
    {/if}

    <!-- Transcription Loading/Trigger Section -->
    {#if loadingTranscription}
      <div class="glass-card text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p class="text-white/70 text-xs">
          {$currentLocale === 'en' ? 'Loading transcription...' : 'Lade Transkription...'}
        </p>
      </div>
    {:else if !transcriptionData && visionData && visionData.length > 0}
      <div class="glass-card text-center py-8">
        <h3 class="text-xs font-semibold text-white mb-4 flex items-center gap-2">
          <MaterialSymbol icon="mic" fontSize={18} class="text-white" />
          {$currentLocale === 'en' ? 'Video Transcription' : 'Video Transkription'}
        </h3>
        <p class="text-white/70 mb-4 text-xs">
          {$currentLocale === 'en'
            ? 'No transcription available yet'
            : 'Noch keine Transkription vorhanden'}
        </p>
        <MsqdxButton glass={true} on:click={triggerTranscription} class="flex items-center gap-2">
          <MaterialSymbol icon="mic" fontSize={18} />
          <MsqdxTypography variant="body2" weight="medium">
            {$currentLocale === 'en' ? 'Transcribe Video' : 'Video transkribieren'}
          </MsqdxTypography>
        </MsqdxButton>
      </div>
    {/if}

    <!-- Vision Analysis Loading State -->
    {#if loadingVision}
      <div class="glass-card text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p class="text-white/70 text-xs">Lade Vision-Analyse-Daten...</p>
      </div>
    {:else if $selectedVideo.status === 'ANALYZING'}
      <div class="glass-card text-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"
        ></div>
        <p class="text-yellow-200 text-xs">Vision-Analyse läuft...</p>
        <p class="text-white/60 text-xs mt-2">Dies kann einige Minuten dauern</p>
      </div>
    {:else if !visionData || visionData.length === 0}
      <div class="glass-card text-center py-8">
        <div class="mx-auto mb-4 text-white/40">
          <MaterialSymbol icon="visibility" fontSize={18} />
        </div>
        <p class="text-white/70 mb-4 text-xs">Noch keine Vision-Analyse verfügbar</p>
        <MsqdxButton
          glass={true}
          on:click={triggerVisionAnalysis}
          class="flex items-center gap-2 mx-auto"
        >
          <MaterialSymbol icon="play_arrow" fontSize={18} />
          <MsqdxTypography variant="body2" weight="medium">Analyse starten</MsqdxTypography>
        </MsqdxButton>
      </div>
    {:else if visionData && visionData.length > 0}
      <!-- Show Vision Analysis for all scenes with Qwen VL -->
      <div class="glass-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">
            {$currentLocale === 'en' ? 'Vision Analysis' : 'Vision-Analyse'}
            <span class="text-xs text-white/60 ml-2"
              >({visionData.length}
              {visionData.length === 1
                ? $currentLocale === 'en'
                  ? 'scene'
                  : 'Szene'
                : $currentLocale === 'en'
                  ? 'scenes'
                  : 'Szenen'})</span
            >
          </h3>
          {#if analyzingQwenVL && qwenVLStatus}
            <div class="flex items-center gap-2 text-sm">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
              <span class="text-green-400">
                {$currentLocale === 'en' ? 'Analyzing' : 'Analysiere'}
                {qwenVLStatus.analyzedScenes}/{qwenVLStatus.totalScenes} ({qwenVLProgress}%)
              </span>
            </div>
          {/if}
        </div>

        {#if analyzingQwenVL && qwenVLStatus}
          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="w-full bg-white/10 rounded-full h-2 mb-2">
              <div
                class="bg-green-400 h-2 rounded-full transition-all duration-300"
                style="width: {qwenVLProgress}%"
              ></div>
            </div>
            <p class="text-xs text-white/60 text-center">
              {$currentLocale === 'en'
                ? `Processing ${qwenVLStatus.analyzedScenes} of ${qwenVLStatus.totalScenes} scenes`
                : `Verarbeite ${qwenVLStatus.analyzedScenes} von ${qwenVLStatus.totalScenes} Szenen`}
            </p>
          </div>
        {/if}

        <div class="space-y-4 max-h-[600px] overflow-y-auto">
          {#each visionData as scene, index}
            {#if scene.qwenVLDescription || scene.aiDescription}
              <div class="border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-sm font-semibold text-white">
                    {$currentLocale === 'en' ? 'Scene' : 'Szene'}
                    {index + 1}
                  </h4>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-white/60">
                      {Math.floor(scene.startTime)}s - {Math.floor(scene.endTime)}s
                    </span>
                    {#if scene.qwenVLProcessed}
                      <span class="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded"
                        >Qwen VL</span
                      >
                    {/if}
                  </div>
                </div>
                <MsqdxVisionTags
                  objects={scene.objects || []}
                  faces={scene.faces || []}
                  sceneClassification={scene.sceneClassification || []}
                  customObjects={scene.customObjects || []}
                  aiDescription={scene.aiDescription || null}
                  qwenVLDescription={scene.qwenVLDescription || null}
                />
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}

    <!-- Reframed Videos Section -->
    {#if reframedVideos.length > 0}
      <div class="mt-8">
        <h2 class="text-xl font-semibold text-white mb-4">
          {$currentLocale === 'en' ? 'Reframed Versions' : 'Reframed Versionen'}
        </h2>

        {#if loadingReframedVideos}
          <div class="glass-card text-center py-8">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"
            ></div>
            <p class="text-white/70 text-xs">
              {$currentLocale === 'en' ? 'Loading reframed videos...' : 'Lade reframed Videos...'}
            </p>
          </div>
        {:else}
          <div class="masonry-gallery columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {#each reframedVideos as reframedVideo}
              <div class="break-inside-avoid mb-4">
                <ReframedVideoCard
                  {reframedVideo}
                  on:play={e => handlePlayReframed(e.detail)}
                  on:download={e => handleDownloadReframed(e.detail)}
                  on:delete={e => handleDeleteReframed(e.detail)}
                />
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{:else if videoNotFound}
  <div class="glass-card text-center py-16">
    <div class="w-24 h-24 mx-auto mb-6 text-white/40">
      <MaterialSymbol icon="play_arrow" fontSize={96} />
    </div>
    <h3 class="text-2xl font-bold text-white mb-4">Video nicht gefunden</h3>
    <p class="text-white/70 mb-8">Das angeforderte Video konnte nicht geladen werden.</p>
    <MsqdxButton glass={true} href={resolve('/videos')} class="flex items-center gap-2">
      <MsqdxTypography variant="body2" weight="medium">Zurück zur Video-Gallery</MsqdxTypography>
    </MsqdxButton>
  </div>
{:else}
  <div class="glass-card text-center py-16">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-6"></div>
    <h3 class="text-2xl font-bold text-white mb-4">Video wird geladen...</h3>
    <p class="text-white/70 mb-8">Bitte warten Sie, während die Video-Details geladen werden.</p>
  </div>
{/if}

<!-- Delete Modal -->
<MsqdxDeleteModal
  bind:open={deleteModalOpen}
  video={$selectedVideo}
  on:close={() => (deleteModalOpen = false)}
  on:confirm={handleDeleteConfirm}
/>

<!-- Reframe Modal -->
<ReframeModal
  bind:show={showReframeModal}
  bind:progress={reframingProgress}
  bind:processing={reframingVideo}
  on:reframe={handleReframe}
  on:close={() => (showReframeModal = false)}
/>

{#if $selectedVideo}
  <MsqdxShareDialog
    bind:open={shareDialogOpen}
    itemId={$selectedVideo.id}
    itemType="video"
    itemName={$selectedVideo.name || $selectedVideo.originalName}
  />
{/if}

<style>
  .dropdown-menu {
    position: absolute;
    left: 0;
    top: 100%;
    margin-top: var(--msqdx-spacing-xs);
    min-width: 180px;
    z-index: 1000;
    backdrop-filter: blur(var(--msqdx-glass-blur));
    border-radius: var(--msqdx-radius-md);
    padding: var(--msqdx-spacing-xxs) 0;
    border: 1px solid var(--msqdx-color-dark-border);
    background: var(--msqdx-color-dark-paper);
  }

  .dropdown-divider {
    height: 1px;
    background: var(--msqdx-color-dark-border);
    margin: var(--msqdx-spacing-xxs) 0;
  }

  .dropdown-item {
    width: 100%;
    text-align: left;
    padding: var(--msqdx-spacing-sm) var(--msqdx-spacing-md);
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-sm);
    background: transparent;
    border: none;
    color: var(--msqdx-color-brand-black) !important;
    font-size: var(--msqdx-font-size-body2);
    font-family: var(--msqdx-font-primary);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
  }

  .dropdown-item-text {
    color: var(--msqdx-color-brand-black) !important;
    font-size: var(--msqdx-font-size-body2);
    font-family: var(--msqdx-font-primary);
    font-weight: var(--msqdx-font-weight-medium);
  }

  .dropdown-item * {
    color: var(--msqdx-color-brand-black) !important;
  }

  .dropdown-item:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }

  .dropdown-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon-16px {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-18px {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner-small {
    width: 12px;
    height: 12px;
    border: 2px solid var(--msqdx-color-dark-text-primary);
    border-top-color: transparent;
    border-radius: var(--msqdx-radius-full);
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .delete-button {
    background: var(--msqdx-color-tint-pink) !important;
    border-color: var(--msqdx-color-status-error) !important;
    color: var(--msqdx-color-status-error) !important;
  }

  .delete-button:hover {
    background: var(--msqdx-color-tint-pink) !important;
    border-color: var(--msqdx-color-status-error) !important;
    opacity: 0.9;
  }

  :global(html.light) .dropdown-menu {
    background: var(--msqdx-color-light-paper);
    border: 1px solid var(--msqdx-color-light-border);
  }

  :global(html.light) .dropdown-item {
    color: var(--msqdx-color-brand-black) !important;
  }

  :global(html.light) .dropdown-item-text {
    color: var(--msqdx-color-brand-black) !important;
  }

  :global(html.light) .dropdown-item * {
    color: var(--msqdx-color-brand-black) !important;
  }

  :global(html.light) .dropdown-item:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
  }

  @media (max-width: 1024px) {
    .flex.gap-2.flex-wrap {
      gap: 0.5rem;
    }
  }

  @media (max-width: 768px) {
    .mb-6 .flex.items-start.justify-between {
      flex-direction: column;
      text-align: left;
    }

    .mb-6 .flex.items-start.justify-between > .flex-1 {
      width: 100%;
    }

    .text-right {
      text-align: left !important;
      width: 100%;
    }

    .flex.flex-wrap.gap-2 {
      flex-direction: column;
    }

    :global(.msqdx-button) {
      width: 100%;
    }

    .masonry-gallery {
      columns: 1 !important;
    }
  }

  @media (max-width: 640px) {
    .chip {
      font-size: 0.7rem;
      padding: 0.25rem 0.5rem;
    }

    .mb-6 h2 {
      font-size: 1.25rem;
    }

    .text-xl.font-bold {
      font-size: 1.5rem;
    }
  }
</style>
