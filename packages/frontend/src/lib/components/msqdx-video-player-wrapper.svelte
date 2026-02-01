<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import MsqdxUnifiedTimeline from './msqdx-unified-timeline.svelte';
  import CentralVideoControls from './central-video-controls.svelte';
  import { audioStemPlayer } from '$lib/services/audio-stem-player.service';
  import { currentLocale } from '$lib/i18n';

  const dispatch = createEventDispatcher();

  // Props
  export let videoSrc: string;
  export let posterSrc: string = '';
  export let scenes: any[] = [];
  export let transcriptionSegments: any[] = [];
  export let videoDuration: number = 0;
  export let originalVideoDuration: number = 0;
  export let videoId: string = '';
  export let isProject: boolean = false;
  export let showVideoControls: boolean = true;
  export let canUndo: boolean = false;
  export let canRedo: boolean = false;
  export let canSplit: boolean = false;
  export let canAddScene: boolean = true;
  export let showSearchModal: boolean = false;
  export let searchQuery: string = '';
  export let searchResults: any[] = [];
  export let searching: boolean = false;

  // Video State
  let videoPlayer: HTMLVideoElement;
  let audioTracks: any[] = [];
  let videoMuted = false;
  let videoAudioLevel = 100; // 0-200%
  let isPlaying = false;
  let currentTime = 0;
  let duration = 0;

  async function handleVideoPlay() {
    isPlaying = true;

    // Use audio stem player for synchronized playback
    try {
      await audioStemPlayer.play();
      console.log('🎵 Audio stem player started');
    } catch (error) {
      console.error('❌ Failed to start audio stem player:', error);
    }

    dispatch('videoPlay');
  }

  function handleVideoPause() {
    isPlaying = false;

    // Pause audio stem player
    audioStemPlayer.pause();
    console.log('🎵 Audio stem player paused');

    dispatch('videoPause');
  }

  function handleVideoSeek() {
    // Seek audio stem player to match video
    audioStemPlayer.seekTo(videoPlayer.currentTime);
    console.log('🎵 Audio stem player seeked to:', videoPlayer.currentTime);

    dispatch('videoSeek', { time: videoPlayer.currentTime });
  }

  function registerAudioTrack(event: CustomEvent) {
    audioTracks.push(event.detail);
    dispatch('audioTrackRegister', event.detail);
  }

  function unregisterAudioTrack(event: CustomEvent) {
    audioTracks = audioTracks.filter(t => t !== event.detail);
    dispatch('audioTrackUnregister', event.detail);
  }

  // Video audio control functions
  function handleVideoMuteToggle(event: CustomEvent) {
    videoMuted = event.detail.muted;
    if (videoPlayer) {
      videoPlayer.muted = videoMuted;
    }
  }

  function handleVideoAudioLevelChange(event: CustomEvent) {
    videoAudioLevel = event.detail.audioLevel;
    if (videoPlayer) {
      videoPlayer.volume = videoAudioLevel / 100;
    }
  }

  // Central Controls Event Handlers
  function handlePlayPause() {
    if (videoPlayer) {
      if (isPlaying) {
        videoPlayer.pause();
      } else {
        videoPlayer.play();
      }
    }
  }

  function handlePrevious() {
    // Find previous scene
    const currentScene = scenes.find(
      scene =>
        videoPlayer.currentTime >= scene.startTime && videoPlayer.currentTime <= scene.endTime
    );

    if (currentScene) {
      const currentIndex = scenes.indexOf(currentScene);
      if (currentIndex > 0) {
        const prevScene = scenes[currentIndex - 1];
        videoPlayer.currentTime = prevScene.startTime;
        dispatch('seekTo', { time: prevScene.startTime });
      }
    }
  }

  function handleNext() {
    // Find current scene
    const currentScene = scenes.find(
      scene =>
        videoPlayer.currentTime >= scene.startTime && videoPlayer.currentTime <= scene.endTime
    );

    if (currentScene) {
      const currentIndex = scenes.indexOf(currentScene);
      if (currentIndex < scenes.length - 1) {
        const nextScene = scenes[currentIndex + 1];
        videoPlayer.currentTime = nextScene.startTime;
        dispatch('seekTo', { time: nextScene.startTime });
      }
    }
  }

  function handleMuteToggle() {
    videoMuted = !videoMuted;
    if (videoPlayer) {
      videoPlayer.muted = videoMuted;
    }
    dispatch('videoMuteToggle', { muted: videoMuted });
  }

  function handleVolumeChange(event: CustomEvent) {
    videoAudioLevel = event.detail.level;
    if (videoPlayer) {
      videoPlayer.volume = videoAudioLevel / 100;
    }
    dispatch('videoAudioLevelChange', { audioLevel: videoAudioLevel });
  }

  function handleTimeUpdate() {
    if (videoPlayer) {
      currentTime = videoPlayer.currentTime;
      duration = videoPlayer.duration || videoDuration;
    }
  }

  // Editing Controls Event Handlers
  function handleUndo() {
    dispatch('undo');
  }

  function handleRedo() {
    dispatch('redo');
  }

  function handleSplit() {
    dispatch('split');
  }

  function handleAddScene() {
    dispatch('addScene');
  }

  function handleSearch() {
    dispatch('search');
  }

  function handleSearchInput(event: CustomEvent) {
    dispatch('searchInput', event.detail);
  }

  function handleAddSceneToProject(event: CustomEvent) {
    console.log('Video Player Wrapper: Adding scene to project:', event.detail);
    dispatch('addSceneToProject', event.detail);
  }

  function handleCloseSearchModal() {
    dispatch('closeSearchModal');
  }

  onMount(() => {
    if (videoPlayer) {
      videoPlayer.addEventListener('play', handleVideoPlay);
      videoPlayer.addEventListener('pause', handleVideoPause);
      videoPlayer.addEventListener('seeked', handleVideoSeek);
      videoPlayer.addEventListener('timeupdate', handleTimeUpdate);
      videoPlayer.addEventListener('loadedmetadata', () => {
        duration = videoPlayer.duration || videoDuration;
      });
    }
  });

  onDestroy(() => {
    if (videoPlayer) {
      videoPlayer.removeEventListener('play', handleVideoPlay);
      videoPlayer.removeEventListener('pause', handleVideoPause);
      videoPlayer.removeEventListener('seeked', handleVideoSeek);
      videoPlayer.removeEventListener('timeupdate', handleTimeUpdate);
    }

    // Clean up audio stem player
    audioStemPlayer.destroy();
  });
</script>

<!-- Video Container -->
<div class="video-container glass-effect rounded-t-375 overflow-hidden aspect-video">
  <video
    bind:this={videoPlayer}
    class="w-full h-full"
    src={videoSrc}
    poster={posterSrc}
    on:timeupdate
  >
    {$currentLocale === 'en'
      ? 'Your browser does not support the video element.'
      : 'Ihr Browser unterstützt das Video-Element nicht.'}
  </video>
</div>

<!-- Central Controls -->
{#if showVideoControls}
  <CentralVideoControls
    bind:isPlaying
    {currentTime}
    {duration}
    {videoMuted}
    bind:videoAudioLevel
    canGoBack={scenes.length > 0 &&
      scenes.findIndex(
        scene =>
          videoPlayer?.currentTime >= scene.startTime && videoPlayer?.currentTime <= scene.endTime
      ) > 0}
    canGoForward={scenes.length > 0 &&
      scenes.findIndex(
        scene =>
          videoPlayer?.currentTime >= scene.startTime && videoPlayer?.currentTime <= scene.endTime
      ) <
        scenes.length - 1}
    {canUndo}
    {canRedo}
    {canSplit}
    {canAddScene}
    {showSearchModal}
    {searchQuery}
    {searchResults}
    {searching}
    on:playPause={handlePlayPause}
    on:previous={handlePrevious}
    on:next={handleNext}
    on:muteToggle={handleMuteToggle}
    on:volumeChange={handleVolumeChange}
    on:undo={handleUndo}
    on:redo={handleRedo}
    on:split={handleSplit}
    on:share={() => dispatch('share')}
    on:addScene={handleAddScene}
    on:search={handleSearch}
    on:searchInput={handleSearchInput}
    on:addSceneToProject={handleAddSceneToProject}
    on:closeSearchModal={handleCloseSearchModal}
  />
{/if}

<!-- Timeline Container -->
<div
  class="timeline-container glass-effect rounded-b-375"
  style="position: relative; z-index: {showSearchModal ? -1 : 1};"
>
  <MsqdxUnifiedTimeline
    {scenes}
    {transcriptionSegments}
    videoElement={videoPlayer}
    {videoDuration}
    {originalVideoDuration}
    {videoId}
    {isProject}
    on:seekTo
    on:sceneClick
    on:sceneResize
    on:sceneResizeEnd
    on:sceneReorder
    on:deleteScene
    on:audioTrackRegister={registerAudioTrack}
    on:audioTrackUnregister={unregisterAudioTrack}
    on:videoMuteToggle={handleVideoMuteToggle}
    on:videoAudioLevelChange={handleVideoAudioLevelChange}
  />
</div>

<style>
  .video-container {
    padding: 0 !important;
    margin-bottom: 0 !important;
    aspect-ratio: 16/9;
    width: 100%;
  }

  .timeline-container {
    padding: 0 !important;
    margin-top: 0 !important;
  }

  .rounded-t-375 {
    border-top-left-radius: var(--msqdx-radius-xxl);
    border-top-right-radius: var(--msqdx-radius-xxl);
  }

  .rounded-b-375 {
    border-bottom-left-radius: var(--msqdx-radius-xxl);
    border-bottom-right-radius: var(--msqdx-radius-xxl);
  }

  @media (max-width: 768px) {
    .rounded-t-375 {
      border-top-left-radius: var(--msqdx-radius-lg);
      border-top-right-radius: var(--msqdx-radius-lg);
    }

    .rounded-b-375 {
      border-bottom-left-radius: var(--msqdx-radius-lg);
      border-bottom-right-radius: var(--msqdx-radius-lg);
    }
  }

  @media (max-width: 640px) {
    .rounded-t-375 {
      border-top-left-radius: var(--msqdx-radius-md);
      border-top-right-radius: var(--msqdx-radius-md);
    }

    .rounded-b-375 {
      border-bottom-left-radius: var(--msqdx-radius-md);
      border-bottom-right-radius: var(--msqdx-radius-md);
    }
  }
</style>
