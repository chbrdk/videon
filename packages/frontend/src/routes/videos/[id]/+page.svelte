<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base, resolve } from '$app/paths';
  import { selectedVideo, videoScenes, loadVideoDetails, refreshVideo } from '$lib/stores/videos.store';
  import { videosApi } from '$lib/api/videos';
  import { saliencyApi } from '$lib/api/saliency';
  import { currentLocale, _ } from '$lib/i18n';
  import { api } from '$lib/config/environment';
  import { showAudioTracks, updateAudioClipsWithScenes } from '$lib/stores/timeline.store';
  import logger from '$lib/utils/logger';
  import MsqdxVisionTags from '$lib/components/msqdx-vision-tags.svelte';
  import MsqdxVideoPlayerWrapper from '$lib/components/msqdx-video-player-wrapper.svelte';
  import MsqdxDeleteModal from '$lib/components/msqdx-delete-modal.svelte';
  import ReframeModal from '$lib/components/ReframeModal.svelte';
  import ReframedVideoCard from '$lib/components/ReframedVideoCard.svelte';
  import MsqdxButton from '$lib/components/ui/MsqdxButton.svelte';
  import MsqdxTypography from '$lib/components/ui/MsqdxTypography.svelte';
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
  
  // Dropdown states
  let servicesOpen = false;
  let exportOpen = false;
  
  // Delete button hover state
  let deleteButtonHovered = false;

  $: videoId = $page.params.id;
  
  // Close dropdowns when clicking outside
  function handleClickOutside(event: MouseEvent) {
    servicesOpen = false;
    exportOpen = false;
  }

  onMount(async () => {
    if (videoId) {
      logger.info('Loading video details', { videoId });
      try {
        const videoDetails = await loadVideoDetails(videoId);
        logger.info('Video details loaded successfully', { videoId, filename: videoDetails?.filename });
        await loadVisionData();
        logger.info('Vision data loaded successfully', { videoId });
        await loadTranscription();
        logger.info('Transcription data loaded successfully', { videoId });
        await loadAudioStems();
        logger.info('Audio stems loaded successfully', { videoId });
        await loadReframedVideos();
        logger.info('Reframed videos loaded successfully', { videoId });
        await loadSaliencyStatus();
        logger.info('Saliency status loaded successfully', { videoId });
        // Load Qwen VL status if available
        await loadQwenVLStatus();
      } catch (error: any) {
        logger.error('Failed to load video details', { videoId, error: error?.message });
        logger.error('Error details', { videoId, error: error?.message || 'Unknown error' });
        videoNotFound = true;
      }
    }
  });

  async function loadQwenVLStatus() {
    if (!videoId) return;
    
    try {
      const response = await fetch(`${api.baseUrl}/videos/${videoId}/qwenVL/status`);
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
    console.log('🎵 First scene:', $videoScenes[0]);
    console.log('🎵 Last scene:', $videoScenes[$videoScenes.length - 1]);
    updateAudioClipsWithScenes($videoScenes);
  } else {
    console.log('🎵 Scenes not loaded yet or empty:', $videoScenes ? $videoScenes.length : 'null');
  }

  async function loadVisionData() {
    if (!videoId) return;
    
    logger.info('Loading vision data', { videoId });
    loadingVision = true;
    try {
      const response = await fetch(`${api.baseUrl}/videos/${videoId}/vision`);
      logger.debug('Vision API response status', { videoId, status: response.status });
      if (response.ok) {
        visionData = await response.json();
        logger.info('Vision data loaded successfully', { videoId, sceneCount: visionData?.length });
      } else {
        logger.error('Vision API error', { videoId, status: response.status, statusText: response.statusText });
      }
    } catch (error: any) {
      logger.error('Failed to load vision data', { videoId, error: error?.message });
    } finally {
      loadingVision = false;
    }
  }

  async function handleRefresh() {
    if (!videoId) return;
    
    refreshing = true;
    try {
      await refreshVideo(videoId);
      await loadVisionData();
      await loadTranscription();
    } finally {
      refreshing = false;
    }
  }

  async function loadTranscription() {
    if (!videoId) return;
    
    console.log('🔍 Loading transcription for video:', videoId);
    loadingTranscription = true;
    try {
      const response = await fetch(`${api.baseUrl}/videos/${videoId}/transcription`);
      if (response.ok) {
        transcriptionData = await response.json();
        console.log('✅ Transcription loaded:', transcriptionData);
      } else if (response.status === 404) {
        console.log('ℹ️ No transcription found for video:', videoId);
        transcriptionData = null;
      } else {
        console.error('❌ Transcription API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Failed to load transcription:', error);
    } finally {
      loadingTranscription = false;
    }
  }

  async function triggerTranscription() {
    if (!videoId) return;
    
    logger.info('Triggering transcription', { videoId });
    try {
      const response = await fetch(
        `${api.baseUrl}/videos/${videoId}/transcribe`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      
      if (response.ok) {
        logger.info('Transcription triggered successfully', { videoId });
        // Wait a moment then reload transcription
        setTimeout(async () => {
          await loadTranscription();
        }, 2000);
      } else {
        logger.error('Failed to trigger transcription', { videoId, status: response.status });
      }
    } catch (error) {
      logger.error('Error triggering transcription', { videoId, error: error?.message });
    }
  }

  async function triggerAudioSeparation() {
    if (!videoId) return;
    
    logger.info('Triggering audio separation', { videoId });
    separatingAudio = true;
    try {
      await videosApi.separateAudio(videoId);
      logger.info('Audio separation triggered successfully', { videoId });
      // Poll for completion and load audio stems
      await pollAudioSeparationStatus();
    } catch (error) {
      logger.error('Failed to trigger audio separation', { videoId, error: error?.message });
    } finally {
      separatingAudio = false;
    }
  }

  async function triggerSpleeterSeparation() {
    if (!videoId) return;
    
    logger.info('Triggering Spleeter audio separation', { videoId });
    separatingSpleeter = true;
    try {
      await videosApi.spleeterSeparateAudio(videoId);
      logger.info('Spleeter audio separation triggered successfully', { videoId });
      // Poll for completion and load audio stems
      await pollAudioSeparationStatus();
    } catch (error) {
      logger.error('Failed to trigger Spleeter audio separation', { videoId, error: error?.message });
    } finally {
      separatingSpleeter = false;
    }
  }

  async function pollAudioSeparationStatus() {
    if (!videoId) return;
    
    console.log('🔄 Polling audio separation status...');
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    
    const poll = async () => {
      try {
        const status = await videosApi.getAudioSeparationStatus(videoId);
        console.log('📊 Audio separation status:', status);
        
        if (status.status === 'completed') {
          console.log('✅ Audio separation completed:', status);
          // Load audio stems into timeline
          await loadAudioStems();
          return;
        } else if (status.status === 'failed') {
          console.error('❌ Audio separation failed:', status.message);
          return;
        } else if (status.status === 'not_started') {
          console.log('ℹ️ Audio separation not started yet');
          // Continue polling
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // Poll every second
        } else {
          console.log('⏰ Audio separation polling timeout');
        }
      } catch (error) {
        console.error('❌ Error polling audio separation status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        }
      }
    };
    
    poll();
  }

  async function triggerSaliencyAnalysis() {
    if (!videoId) return;
    
    logger.info('Triggering saliency analysis', { videoId });
    analyzingSaliency = true;
    try {
      await saliencyApi.analyzeSaliency(videoId);
      logger.info('Saliency analysis triggered successfully', { videoId });
      // Poll for completion
      await pollSaliencyStatus();
      // Reload saliency status after completion
      await loadSaliencyStatus();
    } catch (error: any) {
      logger.error('Failed to trigger saliency analysis', { videoId, error: error?.message });
      const errorMessage = error?.message || 'Failed to start saliency analysis. Please check if the saliency service is running.';
      alert(_('project.error.saliencyStart', { message: errorMessage }));
    } finally {
      analyzingSaliency = false;
    }
  }



  async function triggerQwenVLAnalysis() {
    if (!videoId) return;

    analyzingQwenVL = true;
    try {
      logger.info('Triggering Qwen VL analysis', { videoId });
      const response = await fetch(`${api.baseUrl}/videos/${videoId}/qwenVL`, {
        method: 'POST'
      });

      if (response.ok) {
        logger.info('Qwen VL analysis triggered successfully', { videoId });
        await pollQwenVLStatus();
        await loadQwenVLStatus();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || response.statusText;
        logger.error('Failed to trigger Qwen VL analysis', { videoId, error: errorMessage, status: response.status });
        alert(_('project.error.qwenUnavailable', { error: errorMessage }));
      }
    } catch (error: any) {
      logger.error('Error triggering Qwen VL analysis', { videoId, error: error?.message });
      const errorMessage = error?.message || 'Unknown error';
      alert(_('project.error.qwenUnavailable', { error: errorMessage }));
    } finally {
      analyzingQwenVL = false;
    }
  }

  async function pollQwenVLStatus() {
    if (!videoId) return;
    
    console.log('🔄 Polling Qwen VL analysis status...');
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes max (300 * 2s = 10 minutes for 77 scenes)
    
    const poll = async () => {
      try {
        const response = await fetch(`${api.baseUrl}/videos/${videoId}/qwenVL/status`);
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }
        
        const status = await response.json();
        qwenVLStatus = status;
        qwenVLProgress = status.progress || 0;
        
        console.log('📊 Qwen VL status:', status);
        
        if (status.isComplete || status.status === 'COMPLETED') {
          console.log('✅ Qwen VL analysis completed');
          analyzingQwenVL = false;
          // Reload vision data to show new descriptions
          await loadVisionData();
          // Update status one more time
          await loadQwenVLStatus();
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          console.log('⏰ Qwen VL analysis polling timeout');
          analyzingQwenVL = false;
        }
      } catch (error) {
        console.error('❌ Error polling Qwen VL status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          analyzingQwenVL = false;
        }
      }
    };
    
    poll();
  }

  async function handleExport(format: 'premiere' | 'fcpxml' | 'srt') {
    if (!videoId || exporting) return;
    
    exporting = true;
    currentExportFormat = format;
    
    try {
      console.log(`🎬 Starting ${format} export for video:`, videoId);
      
      const endpoint = format === 'srt' 
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
      const filename = format === 'srt' 
        ? `subtitles_${videoId}.srt`
        : `${format}_export_${videoId}.zip`;
      
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
      case 'UPLOADED': return 'chip chip-primary';
      case 'ANALYZING': return 'chip chip-warning';
      case 'ANALYZED':
      case 'COMPLETE': return 'chip chip-success';
      case 'ERROR': return 'chip chip-error';
      default: return 'chip chip-default';
    }
  }

  function getStatusText(status: string): string {
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
  </script>


<svelte:head>
  <title>Video - PrismVid</title>
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
                <span class="{getStatusChipClass($selectedVideo.status)}">
                  <MaterialSymbol icon="check_circle" fontSize={18} class="inline-block" /> {getStatusText($selectedVideo.status)}
                </span>
                <span class="chip chip-info">
                  <MaterialSymbol icon="storage" fontSize={18} class="inline-block" /> {formatBytes($selectedVideo.fileSize)}
                </span>
                <span class="chip chip-success">
                  <MaterialSymbol icon="schedule" fontSize={18} class="inline-block" /> {formatDuration($selectedVideo.duration)}
                </span>
                {#if saliencyStatus && saliencyStatus.hasAnalysis}
                  <span class="chip chip-success">
                    <MaterialSymbol icon="analytics" fontSize={18} class="inline-block" /> {saliencyStatus.latestAnalysis?.frameCount} {_('videoDetails.frames')}
                  </span>
                {/if}
                {#if qwenVLStatus}
                  {#if qwenVLStatus.status === 'ANALYZING' || (!qwenVLStatus.isComplete && qwenVLStatus.analyzedScenes < qwenVLStatus.totalScenes)}
                    <span class="chip chip-warning">
                      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-1"></div>
                      <span class="icon-18px"><MaterialSymbol icon="analytics" fontSize={18} /></span> Qwen VL: {qwenVLStatus.analyzedScenes || 0}/{qwenVLStatus.totalScenes || 0} ({qwenVLProgress}%)
                    </span>
                  {:else if qwenVLStatus.isComplete && visionData}
                    {@const qwenVLCount = visionData.filter((s: any) => s.qwenVLProcessed).length}
                    {#if qwenVLCount > 0}
                      <span class="chip chip-success">
                        <span class="icon-18px"><MaterialSymbol icon="analytics" fontSize={18} /></span> Qwen VL: {qwenVLCount} {qwenVLCount === 1 ? ($currentLocale === 'en' ? 'scene' : 'Szene') : ($currentLocale === 'en' ? 'scenes' : 'Szenen')}
                      </span>
                    {/if}
                  {/if}
                {/if}
              </div>
              <p class="text-white/60 text-xs mt-2">{_('videoDetails.uploaded')}: {formatDateTime($selectedVideo.uploadedAt)}</p>
              {#if $selectedVideo.analyzedAt}
                <p class="text-white/60 text-xs">{_('videoDetails.analyzed')}: {formatDateTime($selectedVideo.analyzedAt)}</p>
              {/if}
            </div>
          </div>
          <div class="flex gap-2 flex-wrap responsive-button-group">
            <!-- Services Dropdown -->
            <div class="relative">
              <MsqdxButton
                glass={true}
                on:click={() => servicesOpen = !servicesOpen}
                class="flex items-center gap-2"
              >
                <MaterialSymbol icon="play_arrow" fontSize={18} />
                <MsqdxTypography variant="body2" weight="medium">Services</MsqdxTypography>
                <MaterialSymbol icon={servicesOpen ? "expand_less" : "expand_more"} fontSize={18} />
              </MsqdxButton>
              
              {#if servicesOpen}
                <div class="dropdown-menu">
                  <button on:click={() => { handleRefresh(); servicesOpen = false; }} class="dropdown-item" disabled={refreshing}>
                    {#if refreshing}
                      <div class="spinner-small"></div>
                    {:else}
                      <MaterialSymbol icon="refresh" fontSize={16} />
                    {/if}
                    <span class="dropdown-item-text">{refreshing ? _('videoDetails.refreshing') : _('videoDetails.refresh')}</span>
                  </button>
                  <button on:click={() => { triggerVisionAnalysis(); servicesOpen = false; }} class="dropdown-item">
                    <MaterialSymbol icon="play_arrow" fontSize={16} />
                    <span class="dropdown-item-text">{$currentLocale === 'en' ? 'Start Analysis' : 'Analyse starten'}</span>
                  </button>
                  <button on:click={() => { triggerQwenVLAnalysis(); servicesOpen = false; }} class="dropdown-item" disabled={analyzingQwenVL}>
                    {#if analyzingQwenVL}
                      <div class="spinner-small"></div>
                      <span class="dropdown-item-text">{$currentLocale === 'en' ? 'Analyzing...' : 'Analysiere...'}</span>
                    {:else}
                      <MaterialSymbol icon="visibility" fontSize={16} />
                      <span class="dropdown-item-text">{$currentLocale === 'en' ? 'Semantic Analysis (Qwen VL)' : 'Semantische Analyse (Qwen VL)'}</span>
                    {/if}
                  </button>
                  <button on:click={() => { triggerAudioSeparation(); servicesOpen = false; }} class="dropdown-item" disabled={separatingAudio}>
                    {#if separatingAudio}
                      <div class="spinner-small"></div>
                    {:else}
                      <MaterialSymbol icon="music_note" fontSize={16} />
                    {/if}
                    <span class="dropdown-item-text">{separatingAudio ? ($currentLocale === 'en' ? 'Separating...' : 'Trennt...') : ($currentLocale === 'en' ? 'Separate Audio' : 'Audio trennen')}</span>
                  </button>
                  <button on:click={() => { triggerSpleeterSeparation(); servicesOpen = false; }} class="dropdown-item" disabled={separatingSpleeter}>
                    {#if separatingSpleeter}
                      <div class="spinner-small"></div>
                    {:else}
                      <MaterialSymbol icon="graphic_eq" fontSize={16} />
                    {/if}
                    <span class="dropdown-item-text">{$currentLocale === 'en' ? 'Spleeter' : 'Spleeter'}</span>
                  </button>
                  {#if !saliencyAnalyzed}
                    <button on:click={() => { triggerSaliencyAnalysis(); servicesOpen = false; }} class="dropdown-item" disabled={analyzingSaliency}>
                      {#if analyzingSaliency}
                        <div class="spinner-small"></div>
                      {:else}
                        <MaterialSymbol icon="visibility" fontSize={16} />
                      {/if}
                      <span class="dropdown-item-text">{analyzingSaliency ? ($currentLocale === 'en' ? 'Analyzing...' : 'Analysiert...') : ($currentLocale === 'en' ? 'Analyze Saliency' : 'Saliency analysieren')}</span>
                    </button>
                  {/if}
                  {#if saliencyAnalyzed}
                    <button on:click={() => { openReframeModal(); servicesOpen = false; }} class="dropdown-item" disabled={reframingVideo}>
                      <MaterialSymbol icon="movie" fontSize={16} />
                      <span class="dropdown-item-text">{$currentLocale === 'en' ? 'Reframe Video' : 'Video reframen'}</span>
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
            
            <!-- Export Dropdown -->
            <div class="relative">
              <MsqdxButton
                glass={true}
                on:click={() => exportOpen = !exportOpen}
                class="flex items-center gap-2"
              >
                <MaterialSymbol icon="video_file" fontSize={18} />
                <MsqdxTypography variant="body2" weight="medium">Export</MsqdxTypography>
                <MaterialSymbol icon={exportOpen ? "expand_less" : "expand_more"} fontSize={18} />
              </MsqdxButton>
              
              {#if exportOpen}
                <div class="dropdown-menu">
                  <button on:click={() => { handleExport('premiere'); exportOpen = false; }} class="dropdown-item" disabled={exporting}>
                    {#if exporting && currentExportFormat === 'premiere'}
                      <div class="spinner-small"></div>
                    {:else}
                      <MaterialSymbol icon="video_file" fontSize={16} />
                    {/if}
                    <span class="dropdown-item-text">{$currentLocale === 'en' ? 'Export Premiere' : 'Export Premiere'}</span>
                  </button>
                  <button on:click={() => { handleExportXMLOnly('premiere'); exportOpen = false; }} class="dropdown-item" disabled={exporting}>
                    {#if exporting && currentExportFormat === null}
                      <div class="spinner-small"></div>
                    {:else}
                      <MaterialSymbol icon="code" fontSize={16} />
                    {/if}
                    <span class="dropdown-item-text">{$currentLocale === 'en' ? 'XML Only' : 'Nur XML'}</span>
                  </button>
                  {#if transcriptionData}
                    <button on:click={() => { handleExport('srt'); exportOpen = false; }} class="dropdown-item" disabled={exporting}>
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
              on:click={() => deleteModalOpen = true}
              on:mouseenter={() => deleteButtonHovered = true}
              on:mouseleave={() => deleteButtonHovered = false}
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
        on:seekTo={(e) => {
          // Seek handling is now managed by the wrapper component
        }}
        on:audioTrackRegister={(e) => registerAudioTrack(e.detail)}
        on:audioTrackUnregister={(e) => unregisterAudioTrack(e.detail)}
      />
    {/if}

    <!-- Transcription Loading/Trigger Section -->
    {#if loadingTranscription}
      <div class="glass-card text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p class="text-white/70 text-xs">{$currentLocale === 'en' ? 'Loading transcription...' : 'Lade Transkription...'}</p>
      </div>
    {:else if !transcriptionData && visionData && visionData.length > 0}
      <div class="glass-card text-center py-8">
        <h3 class="text-xs font-semibold text-white mb-4 flex items-center gap-2">
          <MaterialSymbol icon="mic" fontSize={18} class="text-white" /> {$currentLocale === 'en' ? 'Video Transcription' : 'Video Transkription'}
        </h3>
        <p class="text-white/70 mb-4 text-xs">{$currentLocale === 'en' ? 'No transcription available yet' : 'Noch keine Transkription vorhanden'}</p>
        <MsqdxButton
          glass={true}
          on:click={triggerTranscription}
          class="flex items-center gap-2"
        >
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
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p class="text-yellow-200 text-xs">Vision-Analyse läuft...</p>
        <p class="text-white/60 text-xs mt-2">Dies kann einige Minuten dauern</p>
      </div>
    {:else if !visionData || visionData.length === 0}
      <div class="glass-card text-center py-8">
        <div class="mx-auto mb-4 text-white/40"><MaterialSymbol icon="visibility" fontSize={18} /></div>
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
            <span class="text-xs text-white/60 ml-2">({visionData.length} {visionData.length === 1 ? ($currentLocale === 'en' ? 'scene' : 'Szene') : ($currentLocale === 'en' ? 'scenes' : 'Szenen')})</span>
          </h3>
          {#if analyzingQwenVL && qwenVLStatus}
            <div class="flex items-center gap-2 text-sm">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
              <span class="text-green-400">
                {$currentLocale === 'en' ? 'Analyzing' : 'Analysiere'} {qwenVLStatus.analyzedScenes}/{qwenVLStatus.totalScenes} ({qwenVLProgress}%)
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
                    {$currentLocale === 'en' ? 'Scene' : 'Szene'} {index + 1}
                  </h4>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-white/60">
                      {Math.floor(scene.startTime)}s - {Math.floor(scene.endTime)}s
                    </span>
                    {#if scene.qwenVLProcessed}
                      <span class="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">Qwen VL</span>
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
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p class="text-white/70 text-xs">{$currentLocale === 'en' ? 'Loading reframed videos...' : 'Lade reframed Videos...'}</p>
          </div>
        {:else}
          <div class="masonry-gallery columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {#each reframedVideos as reframedVideo}
              <div class="break-inside-avoid mb-4">
                <ReframedVideoCard 
                  {reframedVideo}
                  on:play={(e) => handlePlayReframed(e.detail)}
                  on:download={(e) => handleDownloadReframed(e.detail)}
                  on:delete={(e) => handleDeleteReframed(e.detail)}
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
    <div class="w-24 h-24 mx-auto mb-6 text-white/40"><MaterialSymbol icon="play_arrow" fontSize={96} /></div>
    <h3 class="text-2xl font-bold text-white mb-4">Video nicht gefunden</h3>
    <p class="text-white/70 mb-8">
      Das angeforderte Video konnte nicht geladen werden.
    </p>
    <MsqdxButton
      glass={true}
      href={resolve('/videos')}
      class="flex items-center gap-2"
    >
      <MsqdxTypography variant="body2" weight="medium">Zurück zur Video-Gallery</MsqdxTypography>
    </MsqdxButton>
  </div>
{:else}
  <div class="glass-card text-center py-16">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-6"></div>
    <h3 class="text-2xl font-bold text-white mb-4">Video wird geladen...</h3>
    <p class="text-white/70 mb-8">
      Bitte warten Sie, während die Video-Details geladen werden.
    </p>
  </div>
{/if}

<!-- Delete Modal -->
<MsqdxDeleteModal 
  bind:open={deleteModalOpen}
  video={$selectedVideo}
  on:close={() => deleteModalOpen = false}
  on:confirm={handleDeleteConfirm}
/>

<!-- Reframe Modal -->
<ReframeModal 
  bind:show={showReframeModal}
  bind:progress={reframingProgress}
  bind:processing={reframingVideo}
  on:reframe={handleReframe}
  on:close={() => showReframeModal = false}
/>

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