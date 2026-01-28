<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { 
    timelineClips, 
    audioStemClips,
    currentTime, 
    duration, 
    zoomLevel,
    trackConfigs,
    autoScroll,
    playheadPosition,
    showAudioStems,
    audioStemMode,
    showWaveforms,
    updatePlayhead,
    initializeClips,
    audioStemOperations,
    startPlayheadAnimation,
    stopPlayheadAnimation
  } from '$lib/stores/timeline.store';
  import { videosApi } from '$lib/api/videos';
  import { api } from '$lib/config/environment';
  import { audioStemPlayer } from '$lib/services/audio-stem-player.service';
      import SceneTrack from './tracks/SceneTrack.svelte';
      import TranscriptionTrack from './tracks/TranscriptionTrack.svelte';
      import AudioStemClip from './tracks/AudioStemClip.svelte';
      import VoiceSegmentTrack from './tracks/VoiceSegmentTrack.svelte';
      import ReVoiceModal from './ReVoiceModal.svelte';
      import VoiceCloneModal from './VoiceCloneModal.svelte';
      import { voiceSegmentApi } from '$lib/api/voice-segment';
      import { contextMenuStore } from '$lib/stores/context-menu.store';
      import type { VoiceSegment } from '$lib/api/voice-segment';
      import ZoomInIcon from '@material-icons/svg/svg/zoom_in/baseline.svg?raw';
      import ZoomOutIcon from '@material-icons/svg/svg/zoom_out/baseline.svg?raw';
      import AutoScrollIcon from '@material-icons/svg/svg/auto_awesome/baseline.svg?raw';
      import VolumeUpIcon from '@material-icons/svg/svg/volume_up/baseline.svg?raw';
      import VolumeOffIcon from '@material-icons/svg/svg/volume_off/baseline.svg?raw';
      import MusicNoteIcon from '@material-icons/svg/svg/music_note/baseline.svg?raw';
      import MicIcon from '@material-icons/svg/svg/mic/baseline.svg?raw';
      import AudioFileIcon from '@material-icons/svg/svg/audio_file/baseline.svg?raw';
  import logger from '$lib/utils/logger';
  import MsqdxButton from '$lib/components/ui/MsqdxButton.svelte';
  
  const dispatch = createEventDispatcher();

  export let scenes: any[] = [];
  export let transcriptionSegments: any[] = [];
  export let videoElement: HTMLVideoElement;
  export let videoDuration: number = 0;
  export let originalVideoDuration: number = 0; // For resizing in project mode
  export let videoId: string = '';
  export let isProject: boolean = false; // Flag für Project-Scenes
  
  let timelineContainer: HTMLDivElement;
  let scrollContainer: HTMLDivElement;
  let containerWidth = 1000;
  let resizeObserver: ResizeObserver;
  
  // Voice Segment State
  let voiceSegments: VoiceSegment[] = [];
  let selectedSegment: VoiceSegment | null = null;
  let showReVoiceModal = false;
  let showVoiceCloneModal = false;
  
  // Video Event Listeners
  function handleVideoTimeUpdate() {
    if (videoElement && actualDuration > 0) {
      const time = videoElement.currentTime;
      currentTime.set(time);
      
      // Update Playhead Position using actualDuration and timelineWidth
      // No track-label offset needed - everything starts at 0
      logger.debug('Playhead position update', {
        time: time.toFixed(1),
        actualDuration: actualDuration,
        videoElementDuration: videoElement?.duration,
        timelineWidth: timelineWidth,
        zoomLevel: $zoomLevel
      });
      
      if (timelineDuration > 0) {
        const position = (time / timelineDuration) * timelineWidth;
        playheadPosition.set(position);
        console.log('🎯 Playhead position set to:', position);
        
        // Debug logging every 5 seconds
        if (Math.floor(time) % 5 === 0 && Math.floor(time * 10) % 10 === 0) {
          console.log('🎯 Playhead update:', {
            time: time.toFixed(1),
            zoom: $zoomLevel,
            timelineWidth: timelineWidth,
            position: position.toFixed(1),
            autoScroll: $autoScroll
          });
        }
        
        // Auto-Scroll Logic
        if ($autoScroll && scrollContainer) {
          const scrollLeft = scrollContainer.scrollLeft;
          const scrollWidth = scrollContainer.clientWidth;
          
          // Scroll wenn Playhead aus sichtbarem Bereich
          if (position < scrollLeft || position > scrollLeft + scrollWidth) {
            const newScrollLeft = position - (scrollWidth / 2);
            console.log('📜 Auto-scrolling:', scrollLeft, '→', newScrollLeft);
            scrollContainer.scrollLeft = newScrollLeft;
          }
        }
      } else {
        console.log('❌ timelineDuration is 0, setting playhead to 0px');
        playheadPosition.set(0);
      }
    }
  }
  
  function handleVideoPlay() {
    console.log('🎬 Video started playing');
  }
  
  function handleVideoPause() {
    console.log('⏸️ Video paused');
  }
  
  function handleSeekTo(event: CustomEvent) {
    dispatch('seekTo', event.detail);
  }
  
  function handleAudioPlay(event: CustomEvent) {
    console.log('🎵 Audio play requested:', event.detail);
    dispatch('audioPlay', event.detail);
  }
  
  function handleAudioMute(event: CustomEvent) {
    console.log('🔇 Audio mute requested:', event.detail);
    dispatch('audioMute', event.detail);
  }
  
  // Voice Segment Event Handlers
  function handleSegmentEdit(event: CustomEvent<VoiceSegment>) {
    selectedSegment = event.detail;
    showReVoiceModal = true;
  }
  
  function handleSegmentReVoice(event: CustomEvent<VoiceSegment>) {
    selectedSegment = event.detail;
    showReVoiceModal = true;
  }
  
  function handleSegmentContextMenu(event: CustomEvent<{ event: MouseEvent; segment: VoiceSegment }>) {
    const { event: mouseEvent, segment } = event.detail;
    contextMenuStore.set({
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      segment
    });
  }
  
  // Listen for context menu actions
  onMount(() => {
    const handleContextMenuEdit = (e: CustomEvent) => {
      selectedSegment = e.detail;
      showReVoiceModal = true;
    };
    
    const handleContextMenuRevoice = (e: CustomEvent) => {
      selectedSegment = e.detail;
      showReVoiceModal = true;
    };
    
    window.addEventListener('contextmenu-edit', handleContextMenuEdit as EventListener);
    window.addEventListener('contextmenu-revoice', handleContextMenuRevoice as EventListener);
    
    return () => {
      window.removeEventListener('contextmenu-edit', handleContextMenuEdit as EventListener);
      window.removeEventListener('contextmenu-revoice', handleContextMenuRevoice as EventListener);
    };
  });
  
  function handleSegmentPlay(event: CustomEvent<VoiceSegment>) {
    const segment = event.detail;
    // TODO: Implement play functionality
    console.log('Play segment:', segment);
  }
  
  function handleSegmentDelete(event: CustomEvent<VoiceSegment>) {
    const segment = event.detail;
    // TODO: Implement delete functionality
    console.log('Delete segment:', segment);
  }
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Reactive function to update playhead when zoom changes
  $: if (videoElement && timelineDuration > 0 && $zoomLevel && $currentTime) {
    const time = $currentTime;
    const position = (time / timelineDuration) * timelineWidth;
    playheadPosition.set(position);
    console.log('🔄 Reactive playhead update:', {
      zoom: $zoomLevel,
      time: time.toFixed(1),
      timelineDuration: timelineDuration,
      timelineWidth: timelineWidth,
      position: position.toFixed(1)
    });
  }
  
  // Get actual video duration (use video element duration if prop is 0)
  $: actualDuration = videoDuration > 0 ? videoDuration : (videoElement?.duration || 0);
  
  // Timeline duration with minimum 30 seconds for ruler and playhead
  $: timelineDuration = Math.max(actualDuration, 30);
  
  // Log when video duration becomes available
  $: if (actualDuration > 0) {
    console.log('🔄 Video duration now available:', actualDuration);
  }
  
  // Reactive timeline width calculation
  // Ensure timeline always fills at least 100% of container width
  $: timelineWidth = Math.max(containerWidth, timelineDuration * $zoomLevel * 20);
  $: console.log('📏 Timeline width updated:', timelineWidth, 'for zoom:', $zoomLevel, 'videoDuration:', videoDuration, 'actualDuration:', actualDuration, 'timelineDuration:', timelineDuration, 'containerWidth:', containerWidth, 'calculation:', timelineDuration * $zoomLevel * 20);
  
  // Debug: Track audioStemClips changes
  $: console.log('🎵 Timeline audioStemClips updated:', $audioStemClips.length, $audioStemClips.map(c => c.stemType));
  
  // Force re-render when audioStemClips change
  $: if ($audioStemClips.length > 0) {
    console.log('🎵 Timeline: Audio clips available, forcing re-render');
    // Force a re-render by updating a dummy variable
    audioClipsAvailable = $audioStemClips.length;
  }
  
  let audioClipsAvailable = 0;
  
  // Force timeline to re-render when audio clips change
  $: if ($audioStemClips.length > 0) {
    console.log('🎵 Timeline: Forcing re-render with', $audioStemClips.length, 'clips');
    // This will trigger a re-render of the timeline
    timelineForceUpdate = Date.now();
  }
  
  let timelineForceUpdate = 0;
  
  // Local audio clips store for direct loading
  let localAudioClips: any[] = [];
  
  // Load audio clips directly when videoId changes
  $: if (videoId) {
    loadAudioClipsDirectly();
  }
  
  // Automatically create voice segments when vocal stem is available
  $: if (localAudioClips.length > 0) {
    autoCreateVoiceSegments();
  }
  
  async function autoCreateVoiceSegments() {
    try {
      // Check if we already have segments for the vocal stem
      const vocalClip = localAudioClips.find(c => c.stemType === 'vocals');
      if (!vocalClip) return;
      
      // Check if segments already exist
      if (voiceSegments.length > 0) return;
      
      console.log('🎤 Auto-creating voice segments for vocal stem:', vocalClip.audioStemId);
      
      // Get existing segments first
      const existingSegments = await voiceSegmentApi.getSegments(vocalClip.audioStemId);
      
      if (existingSegments.length > 0) {
        // Segments already exist, just load them
        voiceSegments = existingSegments;
        console.log('🎤 Loaded existing voice segments:', existingSegments.length);
      } else {
        // Create new segments from transcription
        console.log('🎤 Creating new voice segments from transcription...');
        voiceSegments = await voiceSegmentApi.createSegments(vocalClip.audioStemId, videoId);
        console.log('🎤 Created voice segments:', voiceSegments.length);
      }
      
      // Make voice segments track visible if we have segments
      if (voiceSegments.length > 0) {
        trackConfigs.update(configs => 
          configs.map(config => 
            config.type === 'voice-segments' 
              ? { ...config, visible: true }
              : config
          )
        );

        // Load re-voiced segments into audio player
        loadReVoicedSegmentsToPlayer();
      }
    } catch (error) {
      console.error('🎤 Failed to auto-create voice segments:', error);
    }
  }

  // Reload voice segments from server
  async function reloadVoiceSegments() {
    try {
      const vocalClip = localAudioClips.find(c => c.stemType === 'vocals');
      if (!vocalClip) return;
      
      console.log('🔄 Reloading voice segments...');
      voiceSegments = await voiceSegmentApi.getSegments(vocalClip.audioStemId);
      console.log('✅ Voice segments reloaded:', voiceSegments.length);
      
      // Add re-voiced segments to audio player
      loadReVoicedSegmentsToPlayer();
    } catch (error) {
      console.error('❌ Failed to reload voice segments:', error);
    }
  }

  // Load re-voiced segments into audio player
  function loadReVoicedSegmentsToPlayer() {
    // Remove all existing voice segments
    for (const segment of voiceSegments) {
      if (segment.reVoicedAudioUrl) {
        audioStemPlayer.removeVoiceSegment(segment.id);
      }
    }

    // Add re-voiced segments to player
    for (const segment of voiceSegments) {
      if (segment.reVoicedAudioUrl && segment.status === 'COMPLETED') {
        audioStemPlayer.addVoiceSegment(
          segment.id,
          segment.reVoicedAudioUrl,
          segment.startTime,
          segment.endTime
        );
      }
    }
  }
  
  // Initialize audio stem player when video element is available
  $: if (videoElement) {
    audioStemPlayer.setVideoElement(videoElement);
  }
  
  async function loadAudioClipsDirectly() {
    try {
      console.log('🎵 Timeline: Loading audio clips directly for video:', videoId);
      const audioStems = await videosApi.getAudioStems(videoId);
      console.log('🎵 Timeline: Direct audio stems loaded:', audioStems.length);
      
      if (audioStems && audioStems.length > 0) {
        // Group stems by type and get the latest one for each type
        const latestStems = audioStems.reduce((acc, stem) => {
          if (!acc[stem.stemType] || stem.id > acc[stem.stemType].id) {
            acc[stem.stemType] = stem;
          }
          return acc;
        }, {} as Record<string, any>);
        
        // Create clips only for the latest stems (one per type)
        const clips = await Promise.all(Object.values(latestStems).map(async (stem, index) => {
          // Get audio file duration using Audio element
          const audio = new Audio(`${api.baseUrl}/audio-stems/${stem.id}/stream`);
          const duration = await new Promise<number>((resolve) => {
            audio.addEventListener('loadedmetadata', () => {
              resolve(audio.duration);
            });
            audio.load();
          });
          
          return {
            id: stem.id,
            audioStemId: stem.id,
            stemType: stem.stemType,
            startTime: 0,
            endTime: duration,
            duration: duration,
            trimStart: 0,
            trimEnd: 0,
            audioLevel: 1.0,
            isSelected: false,
            isMuted: false,
            showWaveform: true,
            order: index,
            sceneId: stem.sceneId || null
          };
        }));
        
        localAudioClips = clips;
        console.log('🎵 Timeline: Direct audio clips set:', localAudioClips.length);
        
        // Load audio tracks into the player
        await loadAudioTracksIntoPlayer(latestStems);
      }
    } catch (error) {
      console.error('🎵 Timeline: Failed to load audio clips directly:', error);
    }
  }
  
  async function loadAudioTracksIntoPlayer(stems: Record<string, any>) {
    try {
      console.log('🎵 Loading audio tracks into player:', Object.keys(stems));
      
      for (const [stemType, stem] of Object.entries(stems)) {
        if (stemType === 'original') continue; // Skip original, we want separated tracks
        
        const audioUrl = `${api.baseUrl}/audio-stems/${stem.id}/stream`;
        console.log(`🎵 Adding track ${stemType}: ${audioUrl}`);
        
        // Get audio file duration
        const audio = new Audio(audioUrl);
        const duration = await new Promise<number>((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
          });
          audio.load();
        });
        
        await audioStemPlayer.addTrack(
          stem.id,
          stemType as 'vocals' | 'music',
          audioUrl,
          0,
          duration
        );
      }
      
      console.log('✅ All audio tracks loaded into player');
    } catch (error) {
      console.error('❌ Failed to load audio tracks into player:', error);
    }
  }
  
  // Force re-render when video element duration changes
  $: if (videoElement?.duration && videoElement.duration > 0) {
    console.log('🔄 Video duration changed to:', videoElement.duration);
  }
  
  // Debug video element and duration
  $: if (videoElement) {
    console.log('🎬 Video element found:', {
      duration: videoElement.duration,
      currentTime: videoElement.currentTime,
      readyState: videoElement.readyState
    });
  }
  
  function handleVideoLoadedMetadata() {
    console.log('📹 Video metadata loaded:', {
      duration: videoElement.duration,
      videoWidth: videoElement.videoWidth,
      videoHeight: videoElement.videoHeight
    });
    
    // Update actual duration when metadata is loaded
    if (videoElement.duration > 0) {
      actualDuration = videoElement.duration;
      console.log('🔄 Video duration updated to:', actualDuration);
    }
  }

  // Audio Stem Event Handlers
  function handleAudioStemSelect(event: CustomEvent) {
    const { audioStemId, stemType } = event.detail;
    audioStemOperations.selectAudioStem(audioStemId);
    dispatch('audioStemSelect', { audioStemId, stemType });
  }
  
  function handleAudioStemTrim(event: CustomEvent) {
    const { audioStemId, trimStart, trimEnd } = event.detail;
    audioStemOperations.updateAudioStemTiming(audioStemId, trimStart, trimEnd);
    dispatch('audioStemTrim', { audioStemId, trimStart, trimEnd });
  }
  
  function handleAudioStemLevel(event: CustomEvent) {
    const { audioStemId, audioLevel } = event.detail;
    console.log('🎵 Audio stem level changed:', audioStemId, audioLevel);
    
    // Update volume in audio stem player
    audioStemPlayer.setTrackVolume(audioStemId, audioLevel);
    
    audioStemOperations.updateAudioStemLevel(audioStemId, audioLevel);
    dispatch('audioStemLevel', { audioStemId, audioLevel });
  }
  
  function handleAudioStemMute(event: CustomEvent) {
    const { audioStemId, isMuted } = event.detail;
    console.log('🎵 Audio stem mute toggled:', audioStemId, isMuted);
    
    // Update mute state in audio stem player
    audioStemPlayer.setTrackMuted(audioStemId, isMuted);
    
    audioStemOperations.toggleAudioStemMute(audioStemId);
    dispatch('audioStemMute', { audioStemId, isMuted });
  }
  
  function handleAudioStemIsolate(event: CustomEvent) {
    const { audioStemId, stemType } = event.detail;
    console.log('🎵 Audio stem isolated:', audioStemId, stemType);
    
    // Mute all other tracks except this one
    const allTracks = audioStemPlayer.getAllTracks();
    allTracks.forEach(track => {
      if (track.id !== audioStemId) {
        audioStemPlayer.setTrackMuted(track.id, true);
      } else {
        audioStemPlayer.setTrackMuted(track.id, false);
      }
    });
    
    audioStemOperations.isolateAudioStem(audioStemId);
    dispatch('audioStemIsolate', { audioStemId, stemType });
  }
  
  // Audio Track Control State
  let showAudioLevelSlider: string | null = null;
  
  // Audio Track Helper Functions
  function getAudioTrackIcon(trackType: string): string {
    switch (trackType) {
      case 'audio-vocals': return MicIcon;
      case 'audio-music': return MusicNoteIcon;
      case 'audio-original': return AudioFileIcon;
      default: return MusicNoteIcon;
    }
  }
  
  function getAudioTrackLabel(trackType: string): string {
    switch (trackType) {
      case 'audio-vocals': return 'Vocals';
      case 'audio-music': return 'Music';
      case 'audio-original': return 'Original';
      default: return 'Audio';
    }
  }
  
  function toggleAudioLevelSlider(trackType: string) {
    showAudioLevelSlider = showAudioLevelSlider === trackType ? null : trackType;
  }
  
  function handleAudioLevelSliderChange(trackType: string, newLevel: number) {
    const audioStemId = getAudioStemIdForTrack(trackType);
    console.log('🎵 Audio level slider changed:', trackType, newLevel);
    
    // Update audio stem player
    audioStemPlayer.setTrackVolume(audioStemId, newLevel);
    
    // Update local clips
    localAudioClips = localAudioClips.map(clip => {
      if (clip.audioStemId === audioStemId) {
        return { ...clip, audioLevel: newLevel };
      }
      return clip;
    });
  }

  // Audio Track Helper Functions
  function getAudioLevelForTrack(trackType: string): number {
    const clip = localAudioClips.find(clip => 
      (trackType === 'audio-vocals' && clip.stemType === 'vocals') ||
      (trackType === 'audio-music' && clip.stemType === 'music') ||
      (trackType === 'audio-original' && clip.stemType === 'original')
    );
    return clip?.audioLevel || 1.0;
  }
  
  function getMuteStateForTrack(trackType: string): boolean {
    const clip = localAudioClips.find(clip => 
      (trackType === 'audio-vocals' && clip.stemType === 'vocals') ||
      (trackType === 'audio-music' && clip.stemType === 'music') ||
      (trackType === 'audio-original' && clip.stemType === 'original')
    );
    return clip?.isMuted || false;
  }
  
  function getAudioStemIdForTrack(trackType: string): string {
    const clip = localAudioClips.find(clip => 
      (trackType === 'audio-vocals' && clip.stemType === 'vocals') ||
      (trackType === 'audio-music' && clip.stemType === 'music') ||
      (trackType === 'audio-original' && clip.stemType === 'original')
    );
    return clip?.audioStemId || '';
  }
  

  // Audio Stem Control Functions
  function toggleAudioStemVisibility() {
    audioStemOperations.toggleAudioStemVisibility();
  }
  
  function setAudioStemMode(mode: 'all' | 'vocals' | 'music' | 'original') {
    audioStemOperations.setAudioStemMode(mode);
  }
  
  function toggleWaveformVisibility() {
    audioStemOperations.toggleWaveformVisibility();
  }
  
  // Load audio stems when project changes
  $: if (isProject && videoId) {
    audioStemOperations.loadAudioStemsForProject(videoId);
  }
  
  onMount(() => {
    if (videoElement) {
      videoElement.addEventListener('timeupdate', handleVideoTimeUpdate);
      videoElement.addEventListener('play', handleVideoPlay);
      videoElement.addEventListener('pause', handleVideoPause);
      videoElement.addEventListener('loadedmetadata', handleVideoLoadedMetadata);
      console.log('🎬 Video event listeners attached');
    }
    
    // Listen for custom setTime events
    const handleSetTime = (event: CustomEvent) => {
      console.log('🎯 Received setTime event:', event.detail);
      const { time } = event.detail;
      if (typeof time === 'number') {
        currentTime.set(time);
        if (timelineDuration > 0) {
          const position = (time / timelineDuration) * timelineWidth;
          playheadPosition.set(position);
          console.log('🎯 Playhead position set via event to:', position);
        }
      }
    };
    
    // Add event listener for setTime events
    document.addEventListener('setTime', handleSetTime as EventListener);
    
    // Initialize Clips
    initializeClips(scenes);
    
    // Set container width
    if (timelineContainer) {
      containerWidth = timelineContainer.clientWidth;
      console.log('📏 Container width:', containerWidth);
      
      // Set up ResizeObserver to track container width changes
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width;
          if (newWidth !== containerWidth) {
            containerWidth = newWidth;
            console.log('📏 Container width updated:', containerWidth);
          }
        }
      });
      
      resizeObserver.observe(timelineContainer);
    }
    
    // Initial playhead position
    if (videoElement && videoDuration > 0) {
      const time = videoElement.currentTime || 0;
      const timelineWidth = Math.max(containerWidth, videoDuration * $zoomLevel * 20);
      const position = (time / videoDuration) * timelineWidth;
      playheadPosition.set(position);
      console.log('🎯 Initial playhead position:', position, 'for time:', time);
    }
    
    // Cleanup function
    return () => {
      document.removeEventListener('setTime', handleSetTime as EventListener);
    };
  });
  
  onDestroy(() => {
    if (videoElement) {
      videoElement.removeEventListener('timeupdate', handleVideoTimeUpdate);
      videoElement.removeEventListener('play', handleVideoPlay);
      videoElement.removeEventListener('pause', handleVideoPause);
      videoElement.removeEventListener('loadedmetadata', handleVideoLoadedMetadata);
    }
    
    // Clean up ResizeObserver
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    
    stopPlayheadAnimation();
  });
</script>

<div class="unified-timeline" bind:this={timelineContainer}>
  
  <!-- Scrollable Tracks Container -->
  <div class="tracks-scroll-container" bind:this={scrollContainer}>
    <!-- Global Playhead (außerhalb des scrollbaren Bereichs) -->
    <div 
      class="global-playhead" 
      style="left: {$playheadPosition}px"
    ></div>
    
    <div class="tracks-inner" style="width: {timelineWidth}px;">
      
      <!-- Tracks dynamisch rendern -->
      {#each $trackConfigs.sort((a, b) => a.order - b.order) as track (track.id)}
        {#if track.visible}
          <div class="track" style="height: {track.height}px">
            <div class="track-content">
                        {#if track.type === 'scenes'}
                          <SceneTrack 
                            scenes={scenes}
                            zoomLevel={$zoomLevel}
                            videoDuration={isProject ? originalVideoDuration : actualDuration}
                            videoId={videoId}
                            isProject={isProject}
                            on:seekTo={handleSeekTo}
                            on:sceneClick={(e) => dispatch('sceneClick', e.detail)}
                            on:sceneResize={(e) => dispatch('sceneResize', e.detail)}
                            on:sceneResizeEnd={(e) => dispatch('sceneResizeEnd', e.detail)}
                            on:sceneReorder={(e) => dispatch('sceneReorder', e.detail)}
                            on:deleteScene={(e) => dispatch('deleteScene', e.detail)}
                            on:videoMuteToggle={(e) => dispatch('videoMuteToggle', e.detail)}
                            on:videoAudioLevelChange={(e) => dispatch('videoAudioLevelChange', e.detail)}
                          />
              {:else if track.type === 'transcription'}
                <TranscriptionTrack 
                  segments={transcriptionSegments}
                  zoomLevel={$zoomLevel}
                  videoDuration={actualDuration}
                  currentTime={$currentTime}
                  on:seekTo={handleSeekTo}
                />
              {:else if track.type === 'voice-segments'}
                {#if voiceSegments.length > 0}
                  <VoiceSegmentTrack
                    audioStemId={localAudioClips.find(c => c.stemType === 'vocals')?.audioStemId || ''}
                    segments={voiceSegments}
                    currentTime={$currentTime}
                    duration={actualDuration}
                    on:edit={handleSegmentEdit}
                    on:revoice={handleSegmentReVoice}
                    on:play={handleSegmentPlay}
                    on:delete={handleSegmentDelete}
                    on:contextmenu={handleSegmentContextMenu}
                  />
                {/if}
              {:else if track.type === 'audio-vocals' || track.type === 'audio-music' || track.type === 'audio-original'}
                {#if $showAudioStems && ($audioStemMode === 'all' || $audioStemMode === track.stemType)}
                  <div class="audio-stem-track">
                    <!-- Track Header mit den gleichen Controls wie Scene-Timeline -->
                    <div class="track-header">
                      <div class="track-label">
                        <div class="icon-18px text-current">{@html getAudioTrackIcon(track.type)}</div>
                        {getAudioTrackLabel(track.type)}
                      </div>
                      <div class="track-controls">
                        <MsqdxButton
                          variant="contained"
                          on:click={() => toggleAudioLevelSlider(track.type)}
                          title="Audio Level: {Math.round(getAudioLevelForTrack(track.type) * 100)}%"
                          class="icon-button-small"
                        >
                          <div class="icon-18px">{@html (getMuteStateForTrack(track.type) ? VolumeOffIcon : VolumeUpIcon)}</div>
                        </MsqdxButton>
                        
                        <!-- Audio Level Controls direkt in der Toolbar -->
                        {#if showAudioLevelSlider === track.type}
                          <div class="audio-level-inline">
                            <span class="level-percentage">{Math.round(getAudioLevelForTrack(track.type) * 100)}%</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="2" 
                              step="0.1"
                              value={getAudioLevelForTrack(track.type)}
                              on:input={(e) => handleAudioLevelSliderChange(track.type, parseFloat(e.target.value))}
                              class="level-slider-inline"
                            />
                          </div>
                        {/if}
                      </div>
                    </div>
                    
                    <!-- Audio Clips Content -->
                    <div class="track-content" style="height: {track.height}px;">
                      {#each localAudioClips.filter(clip => 
                        (track.type === 'audio-vocals' && clip.stemType === 'vocals') ||
                        (track.type === 'audio-music' && clip.stemType === 'music') ||
                        (track.type === 'audio-original' && clip.stemType === 'original')
                      ) as clip (clip.id)}
                        {@const clipDuration = clip.duration > 0 ? clip.duration : actualDuration}
                        {@const clipWidth = Math.max(clipDuration * $zoomLevel * 20, 50)}
                        <AudioStemClip
                          audioStemId={clip.audioStemId}
                          stemType={clip.stemType}
                          startTime={clip.startTime}
                          endTime={clip.endTime > 0 ? clip.endTime : actualDuration}
                          trimStart={clip.trimStart}
                          trimEnd={clip.trimEnd}
                          audioLevel={clip.audioLevel}
                          isSelected={clip.isSelected}
                          isMuted={clip.isMuted}
                          showWaveform={clip.showWaveform && $showWaveforms}
                          width={clipWidth}
                          height={track.height - 40}
                          on:select={handleAudioStemSelect}
                          on:trim={handleAudioStemTrim}
                          on:audioLevel={handleAudioStemLevel}
                          on:mute={handleAudioStemMute}
                          on:isolate={handleAudioStemIsolate}
                        />
                      {/each}
                    </div>
                  </div>
                {:else}
                  <div class="audio-track-placeholder">
                    <span>No {track.stemType} stems available</span>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/if}
      {/each}
      
      <!-- Timeline Ruler (gemeinsame Zeitachse) - JETZT INNERHALB DES SCROLLBARE BEREICHS -->
      <div class="timeline-ruler">
        <!-- Haupt-Marker (alle 10 Sekunden) -->
        {#each Array.from({length: Math.ceil(timelineDuration / 10)}) as _, i}
          <div 
            class="time-marker clickable main-marker" 
            style="left: {(i * 10) * $zoomLevel * 20}px"
            on:click={() => {
              const targetTime = i * 10;
              console.log('🎯 Jumping to time:', targetTime);
              currentTime.set(targetTime);
              playheadPosition.set((targetTime / timelineDuration) * timelineWidth);
              if (videoElement) {
                videoElement.currentTime = targetTime;
              }
            }}
            title="Click to jump to {formatTime(i * 10)}"
          >
            {formatTime(i * 10)}
          </div>
        {/each}
        
        <!-- Feinere Skala zwischen den Haupt-Markern -->
        {#each Array.from({length: Math.ceil(timelineDuration / 10)}) as _, i}
          {#each Array.from({length: 9}) as _, j}
            {@const timePosition = (i * 10) + (j + 1)}
            {#if timePosition <= timelineDuration}
              <div 
                class="time-marker clickable sub-marker" 
                style="left: {timePosition * $zoomLevel * 20}px"
                on:click={() => {
                  console.log('🎯 Jumping to time:', timePosition);
                  currentTime.set(timePosition);
                  playheadPosition.set((timePosition / timelineDuration) * timelineWidth);
                  if (videoElement) {
                    videoElement.currentTime = timePosition;
                  }
                }}
                title="Click to jump to {formatTime(timePosition)}"
              ></div>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
  </div>

  <!-- Voice Segment Modals -->
  <ReVoiceModal 
    segment={selectedSegment}
    show={showReVoiceModal}
    on:close={() => showReVoiceModal = false}
    on:success={async (event) => {
      if (selectedSegment) {
        console.log('Re-Voice completed for segment:', selectedSegment.id);
        // Reload segments to get updated data
        await reloadVoiceSegments();
      }
      showReVoiceModal = false;
    }}
  />

  <VoiceCloneModal 
    show={showVoiceCloneModal}
    sourceSegment={selectedSegment}
    on:close={() => showVoiceCloneModal = false}
    on:success={() => {
      console.log('Voice cloned successfully');
      showVoiceCloneModal = false;
    }}
  />
  

  <!-- Timeline Toolbar -->
  <div class="timeline-toolbar">
    <!-- Audio Stem Controls -->
    
    <div class="zoom-controls">
      <button 
        class="control-btn small"
        on:click={() => {
          const newZoom = Math.max(0.1, $zoomLevel - 0.2);
          console.log('🔍 Zoom out:', $zoomLevel, '→', newZoom);
          zoomLevel.set(newZoom);
        }}
        title="Zoom Out"
      >
        <div class="icon-18px text-current">{@html ZoomOutIcon}</div>
      </button>
      <span class="zoom-level">{Math.round($zoomLevel * 100)}%</span>
      <button 
        class="control-btn small"
        on:click={() => {
          const newZoom = Math.min(5, $zoomLevel + 0.2);
          console.log('🔍 Zoom in:', $zoomLevel, '→', newZoom);
          zoomLevel.set(newZoom);
        }}
        title="Zoom In"
      >
        <div class="icon-18px text-current">{@html ZoomInIcon}</div>
      </button>
    </div>
  </div>
</div>

<style lang="postcss">
  .unified-timeline {
    backdrop-filter: blur(var(--msqdx-glass-blur));
    background: var(--msqdx-color-dark-paper);
    border: 1px solid var(--msqdx-color-dark-border);
    border-radius: 0 0 var(--msqdx-radius-xxl) var(--msqdx-radius-xxl);
    padding: 0 0 var(--msqdx-spacing-lg) 0;
    margin: 0;
  }
  
  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--msqdx-spacing-md);
  }
  
  .timeline-header h3 {
    color: var(--msqdx-color-dark-text-primary);
    font-size: var(--msqdx-font-size-xl);
    font-weight: var(--msqdx-font-weight-semibold);
    font-family: var(--msqdx-font-primary);
    margin: 0;
  }
  
  .timeline-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--msqdx-spacing-sm);
    background: var(--msqdx-color-dark-paper);
    backdrop-filter: blur(var(--msqdx-glass-blur));
    -webkit-backdrop-filter: blur(var(--msqdx-glass-blur));
    border: 1px solid var(--msqdx-color-dark-border);
    border-top: 1px solid rgba(255, 255, 255, 0.18);
    border-left: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: var(--msqdx-radius-full);
    padding: var(--msqdx-spacing-xxs);
    margin-top: var(--msqdx-spacing-md);
    margin-left: auto;
    margin-right: 30px;
    width: fit-content;
    transition: all var(--msqdx-transition-standard);
  }
  
  :global(html.light) .timeline-toolbar {
    background: var(--msqdx-color-light-paper);
    border: 1px solid var(--msqdx-color-light-border);
    border-top: 1px solid rgba(0, 0, 0, 0.18);
    border-left: 1px solid rgba(0, 0, 0, 0.18);
  }
  
  .audio-stem-controls {
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-sm);
  }
  
  .audio-mode-select {
    background: var(--msqdx-color-dark-paper);
    border: 1px solid var(--msqdx-color-dark-border);
    color: var(--msqdx-color-dark-text-primary);
    padding: var(--msqdx-spacing-xxs) var(--msqdx-spacing-sm);
    border-radius: var(--msqdx-radius-md);
    font-size: var(--msqdx-font-size-xs);
    font-family: var(--msqdx-font-primary);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
  }
  
  .audio-mode-select:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .audio-mode-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .audio-mode-select option {
    background: var(--msqdx-color-dark-paper);
    color: var(--msqdx-color-dark-text-primary);
  }
  
  .audio-stem-track {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  
  .audio-track-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--msqdx-color-dark-text-secondary);
    font-size: var(--msqdx-font-size-xs);
    font-family: var(--msqdx-font-primary);
    font-style: italic;
  }
  
  .control-btn {
    background: var(--msqdx-color-dark-paper);
    border: 1px solid var(--msqdx-color-dark-border);
    color: var(--msqdx-color-dark-text-primary);
    padding: var(--msqdx-spacing-sm);
    border-radius: var(--msqdx-radius-full);
    cursor: pointer;
    transition: all var(--msqdx-transition-standard);
    font-size: var(--msqdx-font-size-body1);
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn.small {
    width: 1.75rem;
    height: 1.75rem;
    font-size: var(--msqdx-font-size-xs);
    padding: var(--msqdx-spacing-xxs);
  }
  
  .control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--msqdx-color-brand-orange);
  }
  
  .control-btn.active {
    background: var(--msqdx-color-tint-blue);
    border-color: var(--msqdx-color-brand-blue);
  }

  /* Auto-Scroll Switch */
  .auto-scroll-switch {
    display: flex;
    align-items: center;
  }

  .switch-btn {
    position: relative;
    width: 2rem;
    height: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 0;
    outline: none;
  }

  .switch-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .switch-btn.active {
    background: rgba(100, 150, 255, 0.4);
    border-color: rgba(100, 150, 255, 0.6);
  }

  .switch-thumb {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 0.75rem;
    height: 0.75rem;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s ease;
  }

  .switch-btn.active .switch-thumb {
    transform: translateX(1rem);
  }
  
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  
  .zoom-level {
    color: white;
    font-size: 0.75rem;
    min-width: 2.5rem;
    text-align: center;
    font-weight: 500;
  }
  
  .timeline-ruler {
    position: relative;
    height: 30px;
    background: var(--msqdx-color-dark-paper);
    border-top: 1px solid var(--msqdx-color-dark-border);
    margin-top: var(--msqdx-spacing-sm);
    border-radius: var(--msqdx-radius-xs);
    overflow: hidden; /* Prevent ruler from breaking out to the right */
  }
  
  .time-marker {
    position: absolute;
    color: var(--msqdx-color-dark-text-secondary);
    font-size: var(--msqdx-font-size-xs);
    font-family: var(--msqdx-font-primary);
    top: 5px;
    font-weight: var(--msqdx-font-weight-medium);
  }

  .time-marker.clickable {
    cursor: pointer;
    padding: var(--msqdx-spacing-xxs) var(--msqdx-spacing-xxs);
    border-radius: var(--msqdx-radius-xs);
    transition: all var(--msqdx-transition-standard);
  }

  .time-marker.clickable:hover {
    color: var(--msqdx-color-dark-text-primary);
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }

  .time-marker.main-marker {
    font-weight: var(--msqdx-font-weight-semibold);
    font-size: var(--msqdx-font-size-sm);
  }

  .time-marker.sub-marker {
    width: 8px; /* Größerer Klickbereich */
    height: 8px;
    background: transparent; /* Unsichtbarer Hintergrund */
    top: 2px;
    font-size: 0;
    padding: 0;
    border-radius: 0;
    margin-left: -4px; /* Zentrieren des Klickbereichs um den 1px Strich */
    position: absolute;
  }

  .time-marker.sub-marker::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    width: 1px;
    height: 8px;
    background: rgba(255, 255, 255, 0.4);
  }

  .time-marker.sub-marker:hover::before {
    background: rgba(255, 255, 255, 0.8);
    height: 12px;
  }
  
  .tracks-scroll-container {
    position: relative;
    overflow-x: auto;
    overflow-y: auto;
    max-height: 500px;
    scrollbar-width: thin;
    scrollbar-color: var(--msqdx-color-dark-border) transparent;
    border-radius: var(--msqdx-radius-sm);
    background: transparent;
  }

  .tracks-scroll-container::-webkit-scrollbar {
    height: var(--msqdx-spacing-xs);
    width: var(--msqdx-spacing-xs);
  }

  .tracks-scroll-container::-webkit-scrollbar-track {
    background: transparent;
    border-radius: var(--msqdx-radius-xs);
  }

  .tracks-scroll-container::-webkit-scrollbar-thumb {
    background: var(--msqdx-color-dark-border);
    border-radius: var(--msqdx-radius-xs);
  }

  .tracks-scroll-container::-webkit-scrollbar-thumb:hover {
    background: var(--msqdx-color-dark-text-secondary);
  }
  
  .tracks-inner {
    position: relative;
    min-height: 200px;
  }
  
  .global-playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #ff6b6b;
    z-index: 100;
    pointer-events: none;
    transform: translateX(-1px); /* Center the 2px line */
  }
  
  .global-playhead::before {
    content: '';
    position: absolute;
    top: -8px;
    left: -6px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid #ff6b6b;
  }
  
  .track {
    position: relative;
    background: transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
  }
  
  .track:last-child {
    border-bottom: none;
  }
  
  .track-content .audio-stem-clip{
  height: 100%!important;
  }
  .track-content {
    flex: 1;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  /* Audio Track Controls Styles (exact copy from SceneTrack) */
  .audio-stem-track {
    position: relative;
    width: 100%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    background: transparent;
  }
  
  .track-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
  }

  .track-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .track-controls {
    display: flex;
    gap: var(--msqdx-spacing-xs);
    position: sticky;
    right: 0;
    top: 0;
    z-index: 10;
    background: var(--msqdx-color-brand-orange);
    border: 1px solid var(--msqdx-color-brand-orange);
    border-radius: var(--msqdx-radius-full);
    padding: var(--msqdx-spacing-xs);
    margin-left: auto;
    flex-shrink: 0;
    align-items: center;
    height: fit-content;
  }

  .control-btn.small {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    padding: 0.25rem;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn.small:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  :global(.msqdx-button.icon-button-small) {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    min-height: 32px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .audio-level-inline {
    display: flex;
    align-items: center;
    gap: var(--msqdx-spacing-xxs);
    margin-left: var(--msqdx-spacing-xxs);
    padding: var(--msqdx-spacing-xxs) var(--msqdx-spacing-xs);
    background: rgba(255, 255, 255, 0.15);
    border-radius: var(--msqdx-radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .level-percentage {
    font-size: var(--msqdx-font-size-sm);
    color: var(--msqdx-color-brand-white);
    font-weight: var(--msqdx-font-weight-semibold);
    font-family: var(--msqdx-font-primary);
    min-width: 2.5rem;
    text-align: center;
  }

  .level-slider-inline {
    width: 80px;
    height: 3px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: var(--msqdx-radius-xs);
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  .level-slider-inline::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--msqdx-color-brand-white);
    border-radius: var(--msqdx-radius-full);
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }

  .level-slider-inline::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--msqdx-color-brand-white);
    border-radius: var(--msqdx-radius-full);
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }
  
  .icon-18px {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Responsive Timeline Styles */
  @media (max-width: 768px) {
    .timeline-controls {
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.5rem;
    }
    
    .zoom-controls {
      order: 1;
      width: 100%;
      justify-content: center;
    }
    
    .time-display {
      font-size: 0.75rem;
    }
    
    .track-label {
      font-size: 0.7rem;
      padding: 0.25rem;
    }
    
    .control-btn.small {
      min-width: 44px;
      min-height: 44px;
    }
    
    .tracks-scroll-container {
      max-height: 400px;
    }
  }
  
  
  @media (max-width: 640px) {
    .track-label {
      font-size: 0.65rem;
      padding: 0.25rem;
      min-width: 60px;
    }
    
    .timeline-ruler {
      font-size: 0.65rem;
      height: 25px;
    }
    
    .time-marker {
      font-size: 0.65rem;
    }
    
    .track-label-container {
      min-width: 80px;
    }
    
    .tracks-scroll-container {
      max-height: 300px;
    }
  }
</style>
