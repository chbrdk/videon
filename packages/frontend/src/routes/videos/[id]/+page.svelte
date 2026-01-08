<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { selectedVideo, videoScenes, loadVideoDetails, refreshVideo } from '$lib/stores/videos.store';
  import { videosApi } from '$lib/api/videos';
  import { saliencyApi } from '$lib/api/saliency';
  import { currentLocale, _ } from '$lib/i18n';
  import { api } from '$lib/config/environment';
  import { showAudioTracks, updateAudioClipsWithScenes } from '$lib/stores/timeline.store';
  import logger from '$lib/utils/logger';
  import UdgGlassVisionTags from '$lib/components/udg-glass-vision-tags.svelte';
  import UdgGlassVideoPlayerWrapper from '$lib/components/udg-glass-video-player-wrapper.svelte';
  import UdgGlassDeleteModal from '$lib/components/udg-glass-delete-modal.svelte';
  import ReframeModal from '$lib/components/ReframeModal.svelte';
  import ReframedVideoCard from '$lib/components/ReframedVideoCard.svelte';
  import type { ReframedVideo, ReframeOptions } from '$lib/api/saliency';
      import ArrowBackIcon from '@material-icons/svg/svg/arrow_back/baseline.svg?raw';
      import RefreshIcon from '@material-icons/svg/svg/refresh/baseline.svg?raw';
      import PlayIcon from '@material-icons/svg/svg/play_arrow/baseline.svg?raw';
      import DeleteIcon from '@material-icons/svg/svg/delete/baseline.svg?raw';
      import ExportIcon from '@material-icons/svg/svg/file_download/baseline.svg?raw';
      import VideoIcon from '@material-icons/svg/svg/video_file/baseline.svg?raw';
      import CodeIcon from '@material-icons/svg/svg/code/baseline.svg?raw';
      import SubtitleIcon from '@material-icons/svg/svg/subtitles/baseline.svg?raw';
      import MicIcon from '@material-icons/svg/svg/mic/baseline.svg?raw';
      import VisibilityIcon from '@material-icons/svg/svg/visibility/baseline.svg?raw';
      import VolumeOffIcon from '@material-icons/svg/svg/volume_off/baseline.svg?raw';
      import VolumeUpIcon from '@material-icons/svg/svg/volume_up/baseline.svg?raw';
      import MusicNoteIcon from '@material-icons/svg/svg/music_note/baseline.svg?raw';
      import RecordVoiceOverIcon from '@material-icons/svg/svg/record_voice_over/baseline.svg?raw';
      import MovieIcon from '@material-icons/svg/svg/movie/baseline.svg?raw';
      import StorageIcon from '@material-icons/svg/svg/storage/baseline.svg?raw';
      import ScheduleIcon from '@material-icons/svg/svg/schedule/baseline.svg?raw';
      import AnalyticsIcon from '@material-icons/svg/svg/analytics/baseline.svg?raw';
      import CheckCircleIcon from '@material-icons/svg/svg/check_circle/baseline.svg?raw';
      import ExpandMoreIcon from '@material-icons/svg/svg/expand_more/baseline.svg?raw';
      import ExpandLessIcon from '@material-icons/svg/svg/expand_less/baseline.svg?raw';

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
      }
    } catch (error) {
      // Status endpoint might not be available, ignore
      console.log('Qwen VL status not available');
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
    } catch (error) {
      logger.error('Failed to trigger saliency analysis', { videoId, error: error?.message });
    } finally {
      analyzingSaliency = false;
    }
  }

  async function pollSaliencyStatus() {
    if (!videoId) return;
    
    console.log('🔄 Polling saliency analysis status...');
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max for saliency analysis
    
    const poll = async () => {
      try {
        const status = await saliencyApi.getSaliencyStatus(videoId);
        console.log('📊 Saliency status:', status);
        
        if (status.hasAnalysis) {
          console.log('✅ Saliency analysis completed');
          saliencyAnalyzed = true;
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          console.log('⏰ Saliency analysis polling timeout');
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
    
    logger.info('Playing reframed video', { id: reframedVideo.id, outputPath: reframedVideo.outputPath });
    // Download URL für reframed video
    const videoUrl = `${api.baseUrl}/videos/${reframedVideo.videoId}/reframed/${reframedVideo.id}/download`;
    window.open(videoUrl, '_blank');
  }

  async function handleDownloadReframed(reframedVideo: ReframedVideo) {
    if (reframedVideo.status !== 'COMPLETED') return;
    
    logger.info('Downloading reframed video', { id: reframedVideo.id, outputPath: reframedVideo.outputPath });
    const videoUrl = `${api.baseUrl}/videos/${reframedVideo.videoId}/reframed/${reframedVideo.id}/download`;
    window.open(videoUrl, '_blank');
  }

  async function handleDeleteReframed(reframedVideo: ReframedVideo) {
    logger.info('Deleting reframed video', { id: reframedVideo.id });
    
    try {
      await saliencyApi.deleteReframedVideo(reframedVideo.id);
      
      // Refresh the list of reframed videos
      await loadReframedVideos();
      
      logger.info('✅ Reframed video deleted successfully');
    } catch (error) {
      logger.error('❌ Failed to delete reframed video:', error);
      alert(_('reframe.deleteFailed'));
    }
  }

  async function handleReframe(event: CustomEvent<ReframeOptions>) {
    if (!videoId) return;
    
    const options = event.detail;
    logger.info('Starting reframing', { videoId, options });
    
    reframingVideo = true;
    try {
      const response = await saliencyApi.reframeVideo(videoId, options);
      currentReframingJobId = response.jobId;
      logger.info('Reframing started successfully', { videoId, jobId: response.jobId });
      
      // Poll for completion
      await pollReframingStatus(response.jobId);
    } catch (error) {
      logger.error('Failed to start reframing', { videoId, error: error?.message });
      reframingVideo = false;
    }
  }

  async function pollReframingStatus(jobId: string) {
    if (!jobId) return;
    
    console.log('🔄 Polling reframing status...');
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max for reframing
    
    const poll = async () => {
      try {
        const status = await saliencyApi.getReframingStatus(jobId);
        console.log('📊 Reframing status:', status);
        
        reframingProgress = status.progress;
        
        if (status.completed) {
          console.log('✅ Reframing completed');
          reframingVideo = false;
          showReframeModal = false;
          
          // Reload reframed videos list
          await loadReframedVideos();
          
          // Offer download
          await saliencyApi.downloadReframedVideo(jobId);
          return;
        }
        
        if (status.status === 'ERROR') {
          console.log('❌ Reframing failed');
          reframingVideo = false;
          showReframeModal = false;
          alert('Reframing failed: ' + (status.message || 'Unknown error'));
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          console.log('⏰ Reframing polling timeout');
          reframingVideo = false;
          showReframeModal = false;
        }
      } catch (error) {
        console.error('❌ Error polling reframing status:', error);
      }
    };
    
    poll();
  }

  async function loadSaliencyStatus() {
    if (!videoId) return;
    
    logger.info('Loading saliency status for video', { videoId });
    try {
      saliencyStatus = await saliencyApi.getSaliencyStatus(videoId);
      logger.info('Saliency status loaded:', saliencyStatus);
      
      // Update saliencyAnalyzed based on status
      if (saliencyStatus && saliencyStatus.hasAnalysis) {
        saliencyAnalyzed = true;
        logger.info('Saliency already analyzed', { videoId });
      } else {
        saliencyAnalyzed = false;
        logger.info('Saliency not yet analyzed', { videoId });
      }
    } catch (error) {
      logger.error('Failed to load saliency status:', error);
      saliencyStatus = null;
      saliencyAnalyzed = false;
    }
  }

  async function loadAudioStems() {
    if (!videoId) return;
    
    console.log('🎵 Loading audio stems for video:', videoId);
    try {
      const audioStems = await videosApi.getAudioStems(videoId);
      console.log('✅ Audio stems loaded:', audioStems);
      
        if (audioStems && audioStems.length > 0) {
          console.log('🎵 Showing audio tracks in timeline:', audioStems);
          // Use audio track operations
          showAudioTracks(audioStems);
          
          // Update audio clips with scene data (even for full-video stems)
          if ($videoScenes && $videoScenes.length > 0) {
            console.log('🎵 Updating audio clips with scene data:', $videoScenes.length);
            updateAudioClipsWithScenes($videoScenes);
          } else {
            console.log('🎵 No scenes available, but will update when scenes load');
          }
          
          console.log('✅ Audio tracks should now be visible in timeline');
        } else {
          console.log('ℹ️ No audio stems found for this video');
        }
    } catch (error) {
      console.error('❌ Failed to load audio stems:', error);
    }
  }

  async function loadReframedVideos() {
    if (!videoId) return;
    
    console.log('🎬 Loading reframed videos for video:', videoId);
    loadingReframedVideos = true;
    try {
      const videos = await saliencyApi.getReframedVideos(videoId);
      reframedVideos = videos;
      console.log('✅ Reframed videos loaded:', videos);
    } catch (error) {
      console.error('❌ Failed to load reframed videos:', error);
      reframedVideos = [];
    } finally {
      loadingReframedVideos = false;
    }
  }

  function registerAudioTrack(track: any) {
    audioTracks.push(track);
    console.log('🎵 Audio track registered:', track);
  }

  function unregisterAudioTrack(track: any) {
    audioTracks = audioTracks.filter(t => t !== track);
    console.log('🎵 Audio track unregistered:', track);
  }

  async function triggerVisionAnalysis() {
    if (!videoId) return;
    
    try {
      const response = await fetch(`${api.baseUrl}/videos/${videoId}/vision/analyze`, {
        method: 'POST'
      });
      if (response.ok) {
        // Refresh data after triggering analysis
        await loadVisionData();
      } else {
        console.error('Failed to trigger vision analysis');
      }
    } catch (error) {
      console.error('Error triggering vision analysis:', error);
    }
  }

  let analyzingQwenVL = false;
  let qwenVLStatus: any = null;
  let qwenVLProgress = 0;

  async function triggerQwenVLAnalysis() {
    if (!videoId) return;
    
    analyzingQwenVL = true;
    qwenVLStatus = null;
    try {
      const response = await fetch(`${api.baseUrl}/videos/${videoId}/qwenVL/analyze`, {
        method: 'POST'
      });
      if (response.ok) {
        logger.info('Qwen VL analysis started', { videoId });
        // Start polling for status
        await pollQwenVLStatus();
      } else {
        const errorData = await response.json();
        logger.error('Failed to trigger Qwen VL analysis', { videoId, error: errorData });
        alert(errorData.message || 'Failed to trigger Qwen VL analysis');
      }
    } catch (error) {
      logger.error('Error triggering Qwen VL analysis', { videoId, error });
      alert('Error triggering Qwen VL analysis');
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
      goto('/videos');
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
                  <span class="icon-18px">{@html CheckCircleIcon}</span> {getStatusText($selectedVideo.status)}
                </span>
                <span class="chip chip-info">
                  <span class="icon-18px">{@html StorageIcon}</span> {formatBytes($selectedVideo.fileSize)}
                </span>
                <span class="chip chip-success">
                  <span class="icon-18px">{@html ScheduleIcon}</span> {formatDuration($selectedVideo.duration)}
                </span>
                {#if saliencyStatus && saliencyStatus.hasAnalysis}
                  <span class="chip chip-success">
                    <span class="icon-18px">{@html AnalyticsIcon}</span> {saliencyStatus.latestAnalysis?.frameCount} {_('videoDetails.frames')}
                  </span>
                {/if}
                {#if qwenVLStatus}
                  {#if qwenVLStatus.status === 'ANALYZING' || (!qwenVLStatus.isComplete && qwenVLStatus.analyzedScenes < qwenVLStatus.totalScenes)}
                    <span class="chip chip-warning">
                      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-1"></div>
                      <span class="icon-18px">{@html AnalyticsIcon}</span> Qwen VL: {qwenVLStatus.analyzedScenes || 0}/{qwenVLStatus.totalScenes || 0} ({qwenVLProgress}%)
                    </span>
                  {:else if qwenVLStatus.isComplete && visionData}
                    {@const qwenVLCount = visionData.filter((s: any) => s.qwenVLProcessed).length}
                    {#if qwenVLCount > 0}
                      <span class="chip chip-success">
                        <span class="icon-18px">{@html AnalyticsIcon}</span> Qwen VL: {qwenVLCount} {qwenVLCount === 1 ? ($currentLocale === 'en' ? 'scene' : 'Szene') : ($currentLocale === 'en' ? 'scenes' : 'Szenen')}
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
              <button 
                on:click={() => servicesOpen = !servicesOpen}
                class="glass-button flex items-center gap-2"
              >
                <div class="icon-18px">{@html PlayIcon}</div>
                Services
                <div class="icon-18px">{@html servicesOpen ? ExpandLessIcon : ExpandMoreIcon}</div>
              </button>
              
              {#if servicesOpen}
                <div class="absolute left-0 top-full mt-1 min-w-[180px] z-10 py-1 dropdown-menu">
                  <button on:click={() => { handleRefresh(); servicesOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs" disabled={refreshing}>
                    <div class="icon-16px">{@html RefreshIcon}</div> {refreshing ? _('videoDetails.refreshing') : _('videoDetails.refresh')}
                  </button>
                  <button on:click={() => { triggerVisionAnalysis(); servicesOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs">
                    <div class="icon-16px">{@html PlayIcon}</div> {$currentLocale === 'en' ? 'Start Analysis' : 'Analyse starten'}
                  </button>
                  <button on:click={() => { triggerQwenVLAnalysis(); servicesOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs" disabled={analyzingQwenVL}>
                    {#if analyzingQwenVL}
                      <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      {$currentLocale === 'en' ? 'Analyzing...' : 'Analysiere...'}
                    {:else}
                      <div class="icon-16px">{@html VisibilityIcon}</div>
                      {$currentLocale === 'en' ? 'Semantic Analysis (Qwen VL)' : 'Semantische Analyse (Qwen VL)'}
                    {/if}
                  </button>
                  <button on:click={() => { triggerAudioSeparation(); servicesOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs" disabled={separatingAudio}>
                    <div class="icon-16px">{@html PlayIcon}</div> {separatingAudio ? ($currentLocale === 'en' ? 'Separating...' : 'Trennt...') : ($currentLocale === 'en' ? 'Separate Audio' : 'Audio trennen')}
                  </button>
                  <button on:click={() => { triggerSpleeterSeparation(); servicesOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs" disabled={separatingSpleeter}>
                    <div class="icon-16px">{@html PlayIcon}</div> {separatingSpleeter ? ($currentLocale === 'en' ? 'Separating...' : 'Trennt...') : ($currentLocale === 'en' ? 'Spleeter' : 'Spleeter')}
                  </button>
                  {#if !saliencyAnalyzed}
                    <button on:click={() => { triggerSaliencyAnalysis(); servicesOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs" disabled={analyzingSaliency}>
                      <div class="icon-16px">{@html VisibilityIcon}</div> 
                      {analyzingSaliency ? ($currentLocale === 'en' ? 'Analyzing...' : 'Analysiert...') : 
                       ($currentLocale === 'en' ? 'Analyze Saliency' : 'Saliency analysieren')}
                    </button>
                  {/if}
                  {#if saliencyAnalyzed}
                    <button on:click={() => { openReframeModal(); servicesOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs" disabled={reframingVideo}>
                      <div class="icon-16px">{@html MovieIcon}</div> 
                      {$currentLocale === 'en' ? 'Reframe Video' : 'Video reframen'}
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
            
            <!-- Export Dropdown -->
            <div class="relative">
              <button 
                on:click={() => exportOpen = !exportOpen}
                class="glass-button flex items-center gap-2"
              >
                <div class="icon-18px">{@html VideoIcon}</div>
                Export
                <div class="icon-18px">{@html exportOpen ? ExpandLessIcon : ExpandMoreIcon}</div>
              </button>
              
              {#if exportOpen}
                <div class="absolute left-0 top-full mt-1 min-w-[180px] z-10 py-1 dropdown-menu">
                  <button on:click={() => { handleExport('premiere'); exportOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs" disabled={exporting}>
                    {#if exporting && currentExportFormat === 'premiere'}
                      <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      {$currentLocale === 'en' ? 'Exporting...' : 'Exportiere...'}
                    {:else}
                      <div class="icon-16px">{@html VideoIcon}</div> {$currentLocale === 'en' ? 'Export Premiere' : 'Export Premiere'}
                    {/if}
                  </button>
                  <button on:click={() => { handleExportXMLOnly('premiere'); exportOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs" disabled={exporting}>
                    {#if exporting && currentExportFormat === null}
                      <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      {$currentLocale === 'en' ? 'Exporting...' : 'Exportiere...'}
                    {:else}
                      <div class="icon-16px">{@html CodeIcon}</div> {$currentLocale === 'en' ? 'XML Only' : 'Nur XML'}
                    {/if}
                  </button>
                  {#if transcriptionData}
                    <button on:click={() => { handleExport('srt'); exportOpen = false; }} class="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-xs" disabled={exporting}>
                      {#if exporting && currentExportFormat === 'srt'}
                        <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        {$currentLocale === 'en' ? 'Exporting...' : 'Exportiere...'}
                      {:else}
                        <div class="icon-16px">{@html SubtitleIcon}</div> {$currentLocale === 'en' ? 'SRT' : 'SRT'}
                      {/if}
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
            
            <!-- Delete Button -->
            <button
              on:click={() => deleteModalOpen = true}
              on:mouseenter={() => deleteButtonHovered = true}
              on:mouseleave={() => deleteButtonHovered = false}
              class="glass-button flex items-center gap-2"
              title={$currentLocale === 'en' ? 'Delete Video' : 'Video löschen'}
              style="background: {deleteButtonHovered ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 0, 0, 0.1)'} !important; border-color: rgba(255, 0, 0, 0.3) !important; color: {deleteButtonHovered ? '#f87171' : '#fca5a5'} !important;"
            >
              <div class="icon-18px">{@html DeleteIcon}</div> {$currentLocale === 'en' ? 'Delete' : 'Löschen'}
            </button>
          </div>
        </div>

    <!-- Video Player + Timeline Wrapper -->
    {#if visionData && visionData.length > 0}
      <UdgGlassVideoPlayerWrapper
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
          <div class="icon-18px text-white">{@html MicIcon}</div> {$currentLocale === 'en' ? 'Video Transcription' : 'Video Transkription'}
        </h3>
        <p class="text-white/70 mb-4 text-xs">{$currentLocale === 'en' ? 'No transcription available yet' : 'Noch keine Transkription vorhanden'}</p>
        <button 
          class="glass-button "
          on:click={triggerTranscription}
        >
          <div class="icon-18px text-current">{@html MicIcon}</div> {$currentLocale === 'en' ? 'Transcribe Video' : 'Video transkribieren'}
        </button>
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
        <div class="icon-18px mx-auto mb-4 text-white/40">{@html VisibilityIcon}</div>
        <p class="text-white/70 mb-4 text-xs">Noch keine Vision-Analyse verfügbar</p>
        <button on:click={triggerVisionAnalysis} class="glass-button flex items-center gap-2 mx-auto">
          <div class="icon-18px text-current">{@html PlayIcon}</div> Analyse starten
        </button>
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
                <UdgGlassVisionTags 
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
    <div class="w-24 h-24 mx-auto mb-6 text-white/40">{@html PlayIcon}</div>
    <h3 class="text-2xl font-bold text-white mb-4">Video nicht gefunden</h3>
    <p class="text-white/70 mb-8">
      Das angeforderte Video konnte nicht geladen werden.
    </p>
    <a href="/videos" class="glass-button">
      Zurück zur Video-Gallery
    </a>
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
<UdgGlassDeleteModal 
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
    backdrop-filter: blur(18px);
    border-radius: 8px;
    padding: 4px 0;
    border: 1px solid rgba(255, 255, 255, 0.2);

  }

  .dropdown-menu button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  :global(html.dark) .dropdown-menu {
    background: rgba(20, 20, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    color: #fff;
  }

  :global(html.dark) .dropdown-menu button {
    color: inherit;
  }

  :global(html.light) .dropdown-menu {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    color: #000;
  }

  :global(html.light) .dropdown-menu button {
    color: inherit;
  }

  :global(html.light) .dropdown-menu button:hover {
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
    
    .glass-button {
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