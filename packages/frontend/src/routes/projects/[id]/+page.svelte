<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { projectsApi, type Project } from '$lib/api/projects';
  import { searchApi, type SearchResult } from '$lib/api/search';
  import { videosApi } from '$lib/api/videos';
  import { currentLocale } from '$lib/i18n';
  import { getVideoUrl, getCoverImageUrl, getAudioStemUrl, getProjectUrl } from '$lib/config/environment';
  import { showAudioTracks, trackConfigs, updateCurrentTime, audioStemOperations, showAudioStems, audioStemMode, showWaveforms, audioStemClips } from '$lib/stores/timeline.store';
  import { setCurrentProject, canUndo, canRedo, addToHistory } from '$lib/stores/edit-history.store';
  import MsqdxVideoPlayerWrapper from '$lib/components/msqdx-video-player-wrapper.svelte';
  import MsqdxVisionTags from '$lib/components/msqdx-vision-tags.svelte';
  import MsqdxButton from '$lib/components/ui/MsqdxButton.svelte';
  import MsqdxTypography from '$lib/components/ui/MsqdxTypography.svelte';
  
  // Icons
  import ExportIcon from '@material-icons/svg/svg/file_download/baseline.svg?raw';
  import VideoIcon from '@material-icons/svg/svg/video_file/baseline.svg?raw';
  import CodeIcon from '@material-icons/svg/svg/code/baseline.svg?raw';
  import SubtitleIcon from '@material-icons/svg/svg/subtitles/baseline.svg?raw';
  import PlayIcon from '@material-icons/svg/svg/play_arrow/baseline.svg?raw';
  import PreviewIcon from '@material-icons/svg/svg/preview/baseline.svg?raw';
  import SyncIcon from '@material-icons/svg/svg/sync/baseline.svg?raw';
  import MusicNoteIcon from '@material-icons/svg/svg/music_note/baseline.svg?raw';
  
  let project: Project | null = null;
  let showSearchModal = false;
  let searchQuery = '';
  let searchResults: SearchResult[] = [];
  let searching = false;
  let loading = true;
  let transcriptionSegments: any[] = [];
  
  // Audio Stem State
  let audioStems: any[] = [];
  let loadingAudioStems = false;
  let audioStemError: string | null = null;
  
  // Audio Synchronisation
  let audioElements: Map<string, HTMLAudioElement> = new Map();
  let isAudioSyncEnabled = true;
  
  // Backend History Status
  let canUndoBackend = false;
  let canRedoBackend = false;
  
  // Check backend history for undo/redo availability
  async function checkHistoryStatus() {
    try {
      const history = await projectsApi.getProjectHistory(projectId);
      canUndoBackend = history.length > 0;
      canRedoBackend = false; // Redo is not implemented yet
    } catch (error) {
      console.error('Error checking history:', error);
      canUndoBackend = false;
      canRedoBackend = false;
    }
  }
  
  // Video Player für Preview
  let currentVideoId: string | null = null;
  let currentSceneStartTime: number = 0;
  let currentSceneEndTime: number = 0;
  let audioTracks: any[] = [];
  
  // Preview Mode
  let previewMode = false;
  let generatingPreview = false;
  let previewVideoUrl: string | null = null;
  
  // Audio Separation
  let separatingAudio = false;
  let currentVideoAudioStems: any[] = [];
  
  // Video Player Reference for Split Tool
  let videoPlayerWrapper: any = null;
  
  // Force video reload when switching scenes
  let videoReloadKey = 0;
  
  // Export functionality
  let exporting = false;
  let currentExportFormat: 'premiere' | 'srt' | null = null;
  
  $: projectId = $page.params.id;
  
  onMount(async () => {
    if (projectId) {
      try {
        project = await projectsApi.getProjectById(projectId);
        // Load transcription segments for the project
        transcriptionSegments = await projectsApi.getProjectTranscriptionSegments(projectId);
        console.log('📝 Loaded transcription segments:', transcriptionSegments);
        
        // Set current project for history tracking
        setCurrentProject(projectId);
        
        // Check history status
        await checkHistoryStatus();
        
        // Load project audio stems
        await loadProjectAudioStems();
        
        // Setze das erste Video als Preview, falls vorhanden
        if (project?.scenes.length > 0) {
          const firstScene = project.scenes[0];
          currentVideoId = firstScene.videoId;
          currentSceneStartTime = firstScene.startTime;
          currentSceneEndTime = firstScene.endTime;
          
          // Load audio stems for the first video
          await loadAudioStemsForVideo(firstScene.videoId);
          
          // Force show audio tracks if they exist
          if (currentVideoAudioStems.length > 0) {
            console.log('🎵 Force showing audio tracks for project');
            showAudioTracks(currentVideoAudioStems);
            
            // Also ensure tracks are visible by updating track configs directly
            setTimeout(() => {
              showAudioTracks(currentVideoAudioStems);
              console.log('🔄 Double-checked audio tracks visibility');
              
              // Force update track configs with specific stem IDs
              const vocalsStem = currentVideoAudioStems.find(s => s.stemType === 'vocals');
              const musicStem = currentVideoAudioStems.find(s => s.stemType === 'music');
              
              if (vocalsStem || musicStem) {
                console.log('🎵 Manually setting audio stem IDs:', { vocalsStem, musicStem });
                
                // Directly update track configs
                trackConfigs.update(configs => {
                  const newConfigs = [...configs];
                  
                  if (vocalsStem) {
                    const vocalsIndex = newConfigs.findIndex(c => c.type === 'audio-vocals');
                    if (vocalsIndex !== -1) {
                      newConfigs[vocalsIndex] = {
                        ...newConfigs[vocalsIndex],
                        visible: true,
                        audioStemId: vocalsStem.id
                      };
                      console.log('✅ Set vocals stem ID:', vocalsStem.id);
                    }
                  }
                  
                  if (musicStem) {
                    const musicIndex = newConfigs.findIndex(c => c.type === 'audio-music');
                    if (musicIndex !== -1) {
                      newConfigs[musicIndex] = {
                        ...newConfigs[musicIndex],
                        visible: true,
                        audioStemId: musicStem.id
                      };
                      console.log('✅ Set music stem ID:', musicStem.id);
                    }
                  }
                  
                  return newConfigs;
                });
              }
            }, 500);
          }
        }
      } catch (error) {
        console.error('Failed to load project:', error);
      } finally {
        loading = false;
      }
    }
    
    // Add keyboard event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyboard);
    }
  });
  
  onDestroy(() => {
    // Clean up keyboard event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyboard);
    }
    
    // Clean up audio elements
    audioElements.forEach(audio => {
      audio.pause();
      audio.remove();
    });
    audioElements.clear();
    
    setCurrentProject(null);
  });
  
  // Keyboard Shortcuts
  function handleKeyboard(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // Undo is handled by the toolbar component
        return;
      } else if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        // Redo is handled by the toolbar component
        return;
      }
    }
    if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      splitSceneAtPlayhead();
    }
  }
  
  async function handleSearch() {
    if (!searchQuery.trim()) return;
    searching = true;
    try {
      searchResults = await searchApi.search(searchQuery);
    } finally {
      searching = false;
    }
  }
  
  async function addSceneToProject(result: SearchResult) {
    try {
      console.log('Adding scene to project:', projectId, result);
      
      await projectsApi.addSceneToProject(projectId, {
        videoId: result.videoId,
        startTime: result.startTime,
        endTime: result.endTime
      });
      
      // Reload project and transcription segments
      project = await projectsApi.getProjectById(projectId);
      transcriptionSegments = await projectsApi.getProjectTranscriptionSegments(projectId);
      
      // Load audio stems for the new scene (automatic separation should be triggered by backend)
      setTimeout(() => {
        loadProjectAudioStems();
      }, 1000);
      
      // Add to history
      addToHistory({
        type: 'add_scene',
        data: { 
          videoId: result.videoId, 
          startTime: result.startTime, 
          endTime: result.endTime,
          videoTitle: result.videoTitle
        },
        timestamp: Date.now()
      });
      
      showSearchModal = false;
    } catch (error) {
      console.error('Error adding scene to project:', error);
      alert('Fehler beim Hinzufügen der Szene: ' + error.message);
    }
  }

  // Audio Functions
  async function loadAudioStemsForVideo(videoId: string) {
    console.log('🎵 Loading audio stems for video:', videoId);
    try {
      const audioStems = await videosApi.getAudioStems(videoId);
      console.log('✅ Audio stems loaded:', audioStems);
      
      if (audioStems && audioStems.length > 0) {
        console.log('🎵 Showing audio tracks in timeline:', audioStems);
        showAudioTracks(audioStems);
        currentVideoAudioStems = audioStems;
        console.log('✅ Audio tracks should now be visible in timeline');
        
        // Force update to ensure tracks are visible
        setTimeout(() => {
          showAudioTracks(audioStems);
          console.log('🔄 Forced audio tracks update');
          
          // Also directly set the stem IDs
          const vocalsStem = audioStems.find(s => s.stemType === 'vocals');
          const musicStem = audioStems.find(s => s.stemType === 'music');
          
          if (vocalsStem || musicStem) {
            console.log('🎵 Setting audio stem IDs directly:', { vocalsStem, musicStem });
            
            trackConfigs.update(configs => {
              const newConfigs = [...configs];
              
              if (vocalsStem) {
                const vocalsIndex = newConfigs.findIndex(c => c.type === 'audio-vocals');
                if (vocalsIndex !== -1) {
                  newConfigs[vocalsIndex] = {
                    ...newConfigs[vocalsIndex],
                    visible: true,
                    audioStemId: vocalsStem.id
                  };
                  console.log('✅ Set vocals stem ID:', vocalsStem.id);
                }
              }
              
              if (musicStem) {
                const musicIndex = newConfigs.findIndex(c => c.type === 'audio-music');
                if (musicIndex !== -1) {
                  newConfigs[musicIndex] = {
                    ...newConfigs[musicIndex],
                    visible: true,
                    audioStemId: musicStem.id
                  };
                  console.log('✅ Set music stem ID:', musicStem.id);
                }
              }
              
              return newConfigs;
            });
          }
        }, 100);
      } else {
        console.log('ℹ️ No audio stems found for this video');
        currentVideoAudioStems = [];
      }
    } catch (error) {
      console.error('❌ Failed to load audio stems:', error);
      currentVideoAudioStems = [];
    }
  }
  
  // Load audio stems for entire project
  async function loadProjectAudioStems() {
    if (!projectId) return;
    
    loadingAudioStems = true;
    audioStemError = null;
    
    try {
      console.log('🎵 Loading audio stems for project:', projectId);
      
      // Load project-specific audio stems
      await audioStemOperations.loadAudioStemsForProject(projectId);
      
      // Also load individual video audio stems for compatibility
      if (project?.scenes.length > 0) {
        const uniqueVideoIds = [...new Set(project.scenes.map(scene => scene.videoId))];
        
        for (const videoId of uniqueVideoIds) {
          await loadAudioStemsForVideo(videoId);
        }
      }
      
      console.log('✅ Project audio stems loaded successfully');
      
      // Initialize audio elements for synchronization
      if (isAudioSyncEnabled) {
        initializeAudioElements();
      }
      
    } catch (error) {
      console.error('❌ Error loading project audio stems:', error);
      audioStemError = error.message || 'Failed to load audio stems';
    } finally {
      loadingAudioStems = false;
    }
  }
  
  // Trigger audio separation for a scene
  async function triggerAudioSeparationForScene(sceneId: string, videoId: string, startTime: number, endTime: number) {
    try {
      console.log('🎵 Triggering audio separation for scene:', sceneId);
      
      const response = await fetch(getProjectUrl(projectId, `/scenes/${sceneId}/separate-audio`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startTime,
          endTime,
          stemTypes: ['vocals', 'music', 'original']
        })
      });
      
      if (!response.ok) {
        throw new Error(`Audio separation failed: ${response.status}`);
      }
      
      console.log('✅ Audio separation triggered for scene:', sceneId);
      
      // Reload audio stems after separation
      setTimeout(() => {
        loadProjectAudioStems();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error triggering audio separation:', error);
    }
  }
  
  // Audio Synchronisation Functions
  function initializeAudioElements() {
    if (!isAudioSyncEnabled) return;
    
    console.log('🎵 Initializing audio elements for synchronization');
    
    // Clean up existing audio elements
    audioElements.forEach(audio => {
      audio.pause();
      audio.remove();
    });
    audioElements.clear();
    
    // Create audio elements for each stem
    audioStems.forEach(stem => {
      const audio = document.createElement('audio');
      audio.src = getAudioStemUrl(stem.id);
      audio.preload = 'metadata';
      audio.volume = 0.8; // Default volume
      audio.muted = false;
      
      // Store reference
      audioElements.set(stem.id, audio);
      
      // Add to DOM (hidden)
      audio.style.display = 'none';
      document.body.appendChild(audio);
      
      console.log(`🎵 Created audio element for ${stem.stemType} stem: ${stem.id}`);
    });
  }
  
  function syncAudioWithVideo() {
    if (!isAudioSyncEnabled) return;
    
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return;
    
    audioElements.forEach((audio, stemId) => {
      // Sync playback state
      if (videoElement.paused) {
        audio.pause();
      } else {
        audio.play().catch(error => {
          console.warn(`Failed to play audio stem ${stemId}:`, error);
        });
      }
      
      // Sync current time
      const timeDiff = Math.abs(audio.currentTime - videoElement.currentTime);
      if (timeDiff > 0.1) { // Only sync if difference is significant
        audio.currentTime = videoElement.currentTime;
      }
    });
  }
  
  function updateAudioLevels() {
    audioElements.forEach((audio, stemId) => {
      // Get stem info from timeline store
      const stemClip = $audioStemClips.find(clip => clip.audioStemId === stemId);
      if (stemClip) {
        audio.volume = stemClip.isMuted ? 0 : stemClip.audioLevel;
      }
    });
  }
  
  function toggleAudioSync() {
    isAudioSyncEnabled = !isAudioSyncEnabled;
    console.log('🎵 Audio sync toggled:', isAudioSyncEnabled);
    
    if (isAudioSyncEnabled) {
      initializeAudioElements();
    } else {
      // Clean up audio elements
      audioElements.forEach(audio => {
        audio.pause();
        audio.remove();
      });
      audioElements.clear();
    }
  }

  async function triggerAudioSeparation() {
    if (!currentVideoId || separatingAudio) return;
    
    console.log('🎵 Starting audio separation for video:', currentVideoId);
    separatingAudio = true;
    
    try {
      await videosApi.separateAudio(currentVideoId!);
      console.log('✅ Audio separation triggered');
      
      // Poll for completion
      await pollAudioSeparationStatus();
    } catch (error) {
      console.error('❌ Failed to trigger audio separation:', error);
    } finally {
      separatingAudio = false;
    }
  }

  async function pollAudioSeparationStatus() {
    const poll = async () => {
      try {
        const audioStems = await videosApi.getAudioStems(currentVideoId!);
        if (audioStems && audioStems.length > 0) {
          console.log('✅ Audio separation completed:', audioStems);
          await loadAudioStemsForVideo(currentVideoId!);
          return;
        }
        
        // Continue polling
        setTimeout(poll, 2000);
      } catch (error) {
        console.error('❌ Error polling audio separation status:', error);
      }
    };
    
    poll();
  }

  function registerAudioTrack(track: { id: string; type: string; element: HTMLElement }) {
    audioTracks.push(track);
    console.log('🎵 Audio track registered:', track);
  }

  function unregisterAudioTrack(track: { id: string; type: string; element: HTMLElement }) {
    audioTracks = audioTracks.filter(t => t !== track);
    console.log('🎵 Audio track unregistered:', track);
  }
  
  // Get original video duration for resizing (use the longest video in the project)
  function getOriginalVideoDuration(): number {
    if (!project?.scenes.length) return 0;
    
    // Find the longest original video duration among all scenes
    let maxDuration = 0;
    for (const scene of project.scenes) {
      // Calculate original video duration from scene timing
      // This is an approximation - in a real implementation, you'd store the original video duration
      const sceneDuration = scene.endTime - scene.startTime;
      if (sceneDuration > maxDuration) {
        maxDuration = sceneDuration;
      }
    }
    
    // For now, return a reasonable maximum (e.g., 5 minutes)
    // In a real implementation, you'd get this from the video metadata
    return Math.max(maxDuration * 2, 300); // At least 5 minutes
  }

  // Convert ProjectScenes to Timeline format
  $: timelineScenes = project?.scenes.map((scene, index) => {
    // Calculate cumulative time offset for this scene in the project timeline
    let projectTimeOffset = 0;
    for (let i = 0; i < index; i++) {
      projectTimeOffset += (project!.scenes[i].endTime - project!.scenes[i].startTime);
    }
    
    return {
      id: scene.id,
      videoId: scene.videoId,
      startTime: projectTimeOffset, // Start at project timeline position
      endTime: projectTimeOffset + (scene.endTime - scene.startTime), // End at project timeline position
      keyframePath: null,
      order: scene.order,
      video: scene.video // Include video information for labels
    };
  }) || [];
  
  // Calculate total project duration for timeline
  $: projectDuration = project?.scenes.reduce((total, scene) => 
    total + (scene.endTime - scene.startTime), 0
  ) || 0;
  
  
  
  // Handle Scene Click - Update Video Preview
  async function handleSceneClick(scene: { id: string; startTime: number; endTime: number; videoId: string }) {
    console.log('🎬 Scene clicked:', scene);
    
    // Find the original scene data from the project
    const originalScene = project?.scenes.find(s => s.id === scene.id);
    if (!originalScene) return;
    
    currentVideoId = originalScene.videoId;
    currentSceneStartTime = originalScene.startTime;
    currentSceneEndTime = originalScene.endTime;
    
    // Use scene video URL for Project scenes (on-demand generation)
    // Video player is now managed by the wrapper component
    
    // Load audio stems for the new video if it's different
    if (originalScene.videoId !== currentVideoId) {
      await loadAudioStemsForVideo(originalScene.videoId);
    }
  }
  
  // Handle Scene Resize Preview
  function handleSceneResize(event: CustomEvent) {
    console.log('🔧 Scene resize preview:', event.detail);
    // Could show visual feedback here
  }
  
  // Handle Scene Resize End - Update Database
  async function handleSceneReorder(event: CustomEvent) {
    console.log('🔧 Scene reorder:', event.detail);
    const { scene, fromIndex, toIndex } = event.detail;
    
    try {
      console.log('🔧 Project scenes:', project?.scenes.map(s => ({ id: s.id, order: s.order })));
      
      // Create new order array
      const newOrder = project?.scenes.map((s, index) => ({
        sceneId: s.id,
        order: index === fromIndex ? toIndex : (index === toIndex ? fromIndex : index)
      })) || [];
      
      console.log('🔧 New order array:', newOrder);
      
      // Call backend to reorder
      await projectsApi.reorderScenes(projectId, newOrder);
      
      // Reload project to get updated data
      project = await projectsApi.getProjectById(projectId);
      transcriptionSegments = await projectsApi.getProjectTranscriptionSegments(projectId);
      
      // Update history status
      await checkHistoryStatus();
      
      console.log('✅ Scene reordered successfully');
    } catch (error) {
      console.error('❌ Error reordering scene:', error);
    }
  }
  
  // Handle Scene Resize End - Update Database
  async function handleSceneResizeEnd(event: CustomEvent) {
    console.log('🔧 Scene resize end:', event.detail);
    const { sceneId, handle, newTime, originalStartTime, originalEndTime } = event.detail;
    
    try {
      // Find the scene by ID or by matching start/end times
      let scene = project?.scenes.find(s => s.id === sceneId);
      if (!scene) {
        scene = project?.scenes.find(s => 
          s.startTime === originalStartTime && s.endTime === originalEndTime
        );
      }
      
      if (!scene) {
        console.error('Scene not found for resize');
        return;
      }
      
      // Calculate new timing - convert project timeline time back to original video time
      let updates: any = {};
      if (handle === 'start') {
        // Convert project timeline time to original video time
        updates.startTime = scene.startTime + newTime;
        // Ensure minimum duration
        if (updates.startTime >= scene.endTime - 0.5) {
          updates.startTime = scene.endTime - 0.5;
        }
      } else if (handle === 'end') {
        // Convert project timeline time to original video time
        updates.endTime = scene.startTime + newTime;
        // Ensure minimum duration
        if (updates.endTime <= scene.startTime + 0.5) {
          updates.endTime = scene.startTime + 0.5;
        }
      }
      
      // Add to history before update
      addToHistory({
        type: 'resize',
        data: {
          sceneId: scene.id,
          oldStartTime: scene.startTime,
          oldEndTime: scene.endTime,
          newStartTime: updates.startTime ?? scene.startTime,
          newEndTime: updates.endTime ?? scene.endTime
        },
        timestamp: Date.now()
      });
      
      // Update in database FIRST
      await projectsApi.updateSceneTiming(scene.id, updates);
      
      // THEN delete old scene video with a small delay to ensure database is updated
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        await videosApi.deleteSceneVideo(scene.videoId, originalStartTime, originalEndTime);
        console.log('🗑️ Deleted old scene video');
      } catch (error) {
        console.warn('⚠️ Failed to delete old scene video:', error);
        // Continue anyway - the new video will be generated
      }
      
      // Reload project to get updated data
      project = await projectsApi.getProjectById(projectId);
      transcriptionSegments = await projectsApi.getProjectTranscriptionSegments(projectId);
      
      // Update current scene tracking variables if this scene was currently selected
      if (currentVideoId === scene.videoId && currentSceneStartTime === originalStartTime) {
        const updatedScene = project?.scenes.find(s => s.id === scene.id);
        if (updatedScene) {
          currentSceneStartTime = updatedScene.startTime;
          currentSceneEndTime = updatedScene.endTime;
          console.log('🎬 Updated current scene timing:', updatedScene.startTime, '-', updatedScene.endTime);
        }
      }
      
      console.log('✅ Scene timing updated successfully');
    } catch (error) {
      console.error('❌ Failed to update scene timing:', error);
    }
  }
  
  // Handle scene deletion
  async function handleDeleteScene(scene: { id: string; startTime: number; endTime: number; videoId: string }) {
    if (!confirm(`Are you sure you want to delete this scene?`)) {
      return;
    }
    
    try {
      console.log('🗑️ Deleting scene:', scene);
      
      // Add to history before deletion
      addToHistory({
        type: 'delete_scene',
        data: {
          sceneId: scene.id,
          videoId: scene.videoId,
          startTime: scene.startTime,
          endTime: scene.endTime,
          order: scene.order,
          audioLevel: scene.audioLevel || 1.0
        },
        timestamp: Date.now()
      });
      
      // Delete scene from database
      await projectsApi.removeScene(scene.id);
      
      // Delete scene video file if it exists
      try {
        await videosApi.deleteSceneVideo(scene.videoId, scene.startTime, scene.endTime);
        console.log('🗑️ Deleted scene video file');
      } catch (error) {
        console.warn('⚠️ Failed to delete scene video file:', error);
        // Continue anyway
      }
      
      // Reload project to get updated data
      project = await projectsApi.getProjectById(projectId);
      transcriptionSegments = await projectsApi.getProjectTranscriptionSegments(projectId);
      
      // If the deleted scene was currently playing, switch to first scene
      if (currentVideoId === scene.videoId && 
          currentSceneStartTime === scene.startTime && currentSceneEndTime === scene.endTime) {
        
        if (project?.scenes.length > 0) {
          const firstScene = project.scenes[0];
          currentVideoId = firstScene.videoId;
          currentSceneStartTime = firstScene.startTime;
          currentSceneEndTime = firstScene.endTime;
          
          console.log('🎬 Switched to first remaining scene');
        } else {
          // No scenes left, clear current scene
          currentVideoId = null;
          currentSceneStartTime = 0;
          currentSceneEndTime = 0;
          
          console.log('🎬 No scenes remaining, cleared current scene');
        }
      }
      
      console.log('✅ Scene deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete scene:', error);
      alert('Failed to delete scene. Please try again.');
    }
  }
  
  // Split Scene Function
  async function splitSceneAtPlayhead() {
    if (!currentScene || !videoPlayerWrapper?.videoPlayer) {
      console.warn('No current scene or video player for split');
      return;
    }
    
    const videoPlayer = videoPlayerWrapper.videoPlayer;
    const currentTime = videoPlayer.currentTime;
    
    // Validation: Mindestens 0.5s pro Hälfte
    if (currentTime < 0.5 || (currentSceneDuration - currentTime) < 0.5) {
      alert('Szene zu kurz zum Teilen. Mindestens 0.5 Sekunden pro Hälfte erforderlich.');
      return;
    }
    
    try {
      console.log('✂️ Splitting scene at:', currentTime);
      
      // Call Backend
      const result = await projectsApi.splitScene(currentScene.id, currentTime);
      console.log('✅ Scene split result:', result);
      
      // Reload project
      project = await projectsApi.getProjectById(projectId);
      transcriptionSegments = await projectsApi.getProjectTranscriptionSegments(projectId);
      
      // Add to history
      addToHistory({
        type: 'split_scene',
        data: { sceneId: currentScene.id, splitTime: currentTime },
        timestamp: Date.now()
      });
      
      // Switch to the first part of the split scene
      const firstPart = result.scene1;
      currentVideoId = firstPart.videoId;
      currentSceneStartTime = firstPart.startTime;
      currentSceneEndTime = firstPart.endTime;
      
      console.log('🎬 Switched to first part of split scene');
    } catch (error) {
      console.error('❌ Failed to split scene:', error);
      alert('Failed to split scene. Please try again.');
    }
  }
  
  // Get current scene info
  $: currentScene = project?.scenes.find(scene => 
    scene.videoId === currentVideoId && scene.startTime === currentSceneStartTime
  );
  
  $: currentSceneDuration = currentScene ? currentScene.endTime - currentScene.startTime : 0;
  
  // Get Scene Video URL für Timeline Playback
  function getSceneVideoUrl(videoId: string, startTime: number, endTime: number, trimStart: number = 0, trimEnd: number = 0): string {
    return videosApi.getSceneVideoUrl(videoId, startTime, endTime, trimStart, trimEnd);
  }
  
  // Get Cover Image für Scene
  
  // Handle video time update - auto-advance to next scene
  function handleVideoTimeUpdate(event: Event) {
    if (project && currentVideoId) {
      const videoPlayer = event.target as HTMLVideoElement;
      
      console.log(`🎬 Video time update: currentTime=${videoPlayer.currentTime.toFixed(2)}s, duration=${videoPlayer.duration.toFixed(2)}s, paused=${videoPlayer.paused}, ended=${videoPlayer.ended}`);
      
      // Update timeline current time
      updateCurrentTime(videoPlayer.currentTime);
      
      // Sync audio stems with video
      if (isAudioSyncEnabled) {
        syncAudioWithVideo();
        updateAudioLevels();
      }
      
      // Check if video has ended and trigger auto-advance
      if (videoPlayer.ended) {
        console.log('🎬 Video ended detected in timeupdate, triggering auto-advance');
        handleVideoEnded(event);
      }
    }
  }

  // Handle video ended event - auto-advance to next scene
  function handleVideoEnded(event: Event) {
    console.log('🎬 Video ended event triggered');
    console.log('🎬 Current state:', { currentVideoId, currentSceneStartTime, currentSceneEndTime });
    
    // Stop all audio stems
    if (isAudioSyncEnabled) {
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
    
    if (project && currentVideoId) {
      console.log('🎬 Project scenes:', project.scenes.map(s => ({ 
        id: s.id, 
        videoId: s.videoId, 
        startTime: s.startTime, 
        endTime: s.endTime 
      })));
      
      // Auto-advance to next scene
      const currentIndex = project.scenes.findIndex(scene => 
        scene.videoId === currentVideoId && scene.startTime === currentSceneStartTime
      );
      
      console.log(`🎬 Current scene index: ${currentIndex}, total scenes: ${project.scenes.length}`);
      
      if (currentIndex >= 0 && currentIndex < project.scenes.length - 1) {
        const nextScene = project.scenes[currentIndex + 1];
        console.log('🎬 Auto-advancing to next scene:', nextScene);
        
        // Switch to next scene
        currentVideoId = nextScene.videoId;
        currentSceneStartTime = nextScene.startTime;
        currentSceneEndTime = nextScene.endTime;
        
        // Force video reload by incrementing the reload key
        videoReloadKey++;
        
        // Calculate cumulative time from all previous scenes (not including current)
        let cumulativeTime = 0;
        for (let i = 0; i < currentIndex; i++) {
          const scene = project.scenes[i];
          const trimStart = scene.trimStart || 0;
          const trimEnd = scene.trimEnd || 0;
          const sceneDuration = (scene.endTime - scene.startTime) - trimStart - trimEnd;
          cumulativeTime += sceneDuration;
        }
        
        console.log('🎬 Updated state:', { currentVideoId, currentSceneStartTime, currentSceneEndTime, videoReloadKey, cumulativeTime });
        
        // Force video element to reload with new source
        setTimeout(() => {
          console.log('🎬 Starting next scene playback');
          const videoElement = document.querySelector('video') as HTMLVideoElement;
          if (videoElement) {
            console.log('🎬 Video element found, updating source');
            
            // Get the new video source URL
            const newVideoSource = getVideoSource();
            console.log('🎬 New video source:', newVideoSource);
            
            // Update the video source directly
            videoElement.src = newVideoSource;
            
            // Force reload the video element
            videoElement.load();
            
            // Wait for the video to load the new source
            videoElement.addEventListener('canplay', () => {
              console.log('🎬 Video can play, starting playback');
              
              // Update timeline time AFTER video is loaded to prevent reset to 0
              updateCurrentTime(cumulativeTime);
              console.log('🎬 Timeline time updated to:', cumulativeTime);
              
              // Force timeline to update by dispatching a custom event
              const timelineElement = document.querySelector('msqdx-unified-timeline');
              if (timelineElement) {
                timelineElement.dispatchEvent(new CustomEvent('setTime', { 
                  detail: { time: cumulativeTime } 
                }));
                console.log('🎬 Dispatched setTime event to timeline:', cumulativeTime);
              }
              
              // Small delay to ensure timeline update is processed
              setTimeout(() => {
                videoElement.play().catch(error => {
                  console.error('🎬 Playback failed:', error);
                });
              }, 100);
            }, { once: true });
          }
        }, 100);
      } else {
        console.log('🎬 No more scenes to play');
      }
    }
  }
  async function togglePreviewMode() {
    if (previewMode) {
      // Switch back to scene-by-scene mode
      previewMode = false;
      previewVideoUrl = null;
      
      // Reset to first scene
      if (project?.scenes.length > 0) {
        const firstScene = project.scenes[0];
        currentVideoId = firstScene.videoId;
        currentSceneStartTime = firstScene.startTime;
        currentSceneEndTime = firstScene.endTime;
      }
    } else {
      // Switch to preview mode
      previewMode = true;
      await generatePreviewVideo();
    }
  }

  async function generatePreviewVideo() {
    if (!projectId || generatingPreview) return;
    
    generatingPreview = true;
    console.log('🎬 Generating project preview video...');
    
    try {
      // The preview URL will be generated by the backend
      previewVideoUrl = getProjectUrl(projectId, '/preview');
      console.log('✅ Preview video URL generated:', previewVideoUrl);
    } catch (error) {
      console.error('❌ Failed to generate preview video:', error);
      previewMode = false;
      previewVideoUrl = null;
    } finally {
      generatingPreview = false;
    }
  }

  // Get video source based on mode
  function getVideoSource(): string {
    if (previewMode && previewVideoUrl) {
      return `${previewVideoUrl}?reload=${videoReloadKey}`;
    } else if (currentVideoId) {
      // Find current scene to get trim values
      const currentScene = project?.scenes.find(scene => 
        scene.videoId === currentVideoId && 
        scene.startTime === currentSceneStartTime
      );
      
      const trimStart = currentScene?.trimStart || 0;
      const trimEnd = currentScene?.trimEnd || 0;
      
      return `${getSceneVideoUrl(currentVideoId, currentSceneStartTime, currentSceneEndTime, trimStart, trimEnd)}&reload=${videoReloadKey}`;
    }
    return '';
  }
  async function handleUndo() {
    console.log('🔄 Undo triggered from central controls');
    try {
      await projectsApi.undoLastAction(projectId);
      // Reload project to get updated data
      project = await projectsApi.getProjectById(projectId);
      transcriptionSegments = await projectsApi.getProjectTranscriptionSegments(projectId);
      
      // Update history status
      await checkHistoryStatus();
      
      console.log('✅ Undo successful');
    } catch (error) {
      console.error('❌ Undo failed:', error);
    }
  }

  async function handleRedo() {
    console.log('🔄 Redo triggered from central controls');
    try {
      await projectsApi.redoLastAction(projectId);
      // Reload project to get updated data
      project = await projectsApi.getProjectById(projectId);
      transcriptionSegments = await projectsApi.getProjectTranscriptionSegments(projectId);
      
      // Update history status
      await checkHistoryStatus();
      
      console.log('✅ Redo successful');
    } catch (error) {
      console.error('❌ Redo failed:', error);
    }
  }

  function handleSplit() {
    splitSceneAtPlayhead();
  }

  function handleAddScene() {
    showSearchModal = true;
  }

  function handleSearchEvent() {
    handleSearch();
  }

  function handleSearchInput(event: CustomEvent) {
    searchQuery = event.detail.value;
  }

  function handleAddSceneToProject(event: CustomEvent) {
    console.log('Project Page: Adding scene to project:', event.detail);
    addSceneToProject(event.detail);
  }

  function handleCloseSearchModal() {
    showSearchModal = false;
  }

  // Export functions
  async function handleProjectExport(format: 'premiere' | 'srt') {
    if (!projectId || exporting) return;
    
    exporting = true;
    currentExportFormat = format;
    
    try {
      console.log(`🎬 Starting ${format} export for project:`, projectId);
      
      const endpoint = format === 'srt' 
        ? getProjectUrl(projectId, '/export/srt')
        : getProjectUrl(projectId, '/export/premiere');
      
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
        ? `project_subtitles_${projectId}.srt`
        : `premiere_project_export_${projectId}.zip`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`✅ ${format} export completed and downloaded`);
      
    } catch (error: any) {
      console.error(`❌ ${format} export failed:`, error);
      alert(`${$currentLocale === 'en' ? 'Export failed' : 'Export fehlgeschlagen'}: ${error?.message || ($currentLocale === 'en' ? 'Unknown error' : 'Unbekannter Fehler')}`);
    } finally {
      exporting = false;
      currentExportFormat = null;
    }
  }

  async function handleProjectExportXMLOnly() {
    if (!projectId || exporting) return;
    
    exporting = true;
    currentExportFormat = null;
    
    try {
      console.log(`📄 Starting XML-only export for project:`, projectId);
      
      const endpoint = getProjectUrl(projectId, '/export/premiere/xml');
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
      link.download = `premiere_project_export_${projectId}.xml`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ XML export completed successfully');
      
    } catch (error: any) {
      console.error('❌ XML export failed:', error);
      alert(`${$currentLocale === 'en' ? 'XML Export failed' : 'XML Export fehlgeschlagen'}: ${error?.message || ($currentLocale === 'en' ? 'Unknown error' : 'Unbekannter Fehler')}`);
    } finally {
      exporting = false;
      currentExportFormat = null;
    }
  }
</script>

<div class="max-w-7xl mx-auto px-4 py-8">
  {#if loading}
    <div class="text-center py-12">
      <div class="text-lg">Loading project...</div>
    </div>
  {:else if project}
    <!-- Project Header -->
    <div class="mb-6">

      {#if project.description}
        <p class="text-gray-600 dark:text-gray-400">{project.description}</p>
      {/if}
      {#if currentScene}
        <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {$currentLocale === 'en' ? 'Current Scene:' : 'Aktuelle Szene:'} 
          {Math.floor(currentScene.startTime / 60)}:{Math.floor(currentScene.startTime % 60).toString().padStart(2, '0')} - 
          {Math.floor(currentScene.endTime / 60)}:{Math.floor(currentScene.endTime % 60).toString().padStart(2, '0')} 
          ({Math.floor(currentSceneDuration)}s)
        </div>
      {/if}
    </div>
    
    <!-- Project Controls -->
    <div class="mb-4 flex gap-4 flex-wrap">
      <!-- Preview Mode Toggle -->
      <MsqdxButton
        glass={true}
        on:click={togglePreviewMode}
        disabled={generatingPreview}
        class="flex items-center gap-2"
      >
        {#if generatingPreview}
          <div class="spinner-small"></div>
          <MsqdxTypography variant="body2" weight="medium">Generating...</MsqdxTypography>
        {:else if previewMode}
          <div class="icon-18px">{@html PreviewIcon}</div>
          <MsqdxTypography variant="body2" weight="medium">Scene Mode</MsqdxTypography>
        {:else}
          <div class="icon-18px">{@html PreviewIcon}</div>
          <MsqdxTypography variant="body2" weight="medium">Preview Mode</MsqdxTypography>
        {/if}
      </MsqdxButton>
      
      <!-- Audio Sync Toggle -->
      <MsqdxButton
        glass={true}
        on:click={toggleAudioSync}
        title="Toggle Audio Stem Synchronization"
        class="flex items-center gap-2"
      >
        <div class="icon-18px">{@html SyncIcon}</div>
        <MsqdxTypography variant="body2" weight="medium">
          {isAudioSyncEnabled ? 'Audio Sync ON' : 'Audio Sync OFF'}
        </MsqdxTypography>
      </MsqdxButton>
      
      <!-- Audio Separation Button -->
      {#if currentVideoId}
        <MsqdxButton
          glass={true}
          on:click={triggerAudioSeparation}
          disabled={separatingAudio}
          class="flex items-center gap-2"
        >
          {#if separatingAudio}
            <div class="spinner-small"></div>
            <MsqdxTypography variant="body2" weight="medium">
              {$currentLocale === 'en' ? 'Separating...' : 'Trenne...'}
            </MsqdxTypography>
          {:else}
            <div class="icon-18px">{@html MusicNoteIcon}</div>
            <MsqdxTypography variant="body2" weight="medium">
              {$currentLocale === 'en' ? 'Separate Audio' : 'Audio trennen'}
            </MsqdxTypography>
          {/if}
        </MsqdxButton>
      {/if}
      
      <!-- Export Buttons -->
      <MsqdxButton
        glass={true}
        on:click={() => handleProjectExport('premiere')}
        disabled={exporting}
        class="flex items-center gap-2"
      >
        {#if exporting && currentExportFormat === 'premiere'}
          <div class="spinner-small"></div>
          <MsqdxTypography variant="body2" weight="medium">
            {$currentLocale === 'en' ? 'Exporting...' : 'Exportiere...'}
          </MsqdxTypography>
        {:else}
          <div class="icon-18px">{@html VideoIcon}</div>
          <MsqdxTypography variant="body2" weight="medium">
            {$currentLocale === 'en' ? 'Export Premiere' : 'Export Premiere'}
          </MsqdxTypography>
        {/if}
      </MsqdxButton>
      
      <MsqdxButton
        glass={true}
        on:click={() => handleProjectExportXMLOnly()}
        disabled={exporting}
        class="flex items-center gap-2"
      >
        {#if exporting && currentExportFormat === null}
          <div class="spinner-small"></div>
          <MsqdxTypography variant="body2" weight="medium">
            {$currentLocale === 'en' ? 'Exporting...' : 'Exportiere...'}
          </MsqdxTypography>
        {:else}
          <div class="icon-18px">{@html CodeIcon}</div>
          <MsqdxTypography variant="body2" weight="medium">
            {$currentLocale === 'en' ? 'XML Only' : 'Nur XML'}
          </MsqdxTypography>
        {/if}
      </MsqdxButton>
      
      {#if transcriptionSegments.length > 0}
        <MsqdxButton
          glass={true}
          on:click={() => handleProjectExport('srt')}
          disabled={exporting}
          class="flex items-center gap-2"
        >
          {#if exporting && currentExportFormat === 'srt'}
            <div class="spinner-small"></div>
            <MsqdxTypography variant="body2" weight="medium">
              {$currentLocale === 'en' ? 'Exporting...' : 'Exportiere...'}
            </MsqdxTypography>
          {:else}
            <div class="icon-18px">{@html SubtitleIcon}</div>
            <MsqdxTypography variant="body2" weight="medium">
              {$currentLocale === 'en' ? 'SRT' : 'SRT'}
            </MsqdxTypography>
          {/if}
        </MsqdxButton>
      {/if}
    </div>
    
    <!-- Video Player + Timeline Wrapper -->
    {#if currentVideoId || previewMode}
      <MsqdxVideoPlayerWrapper
        bind:this={videoPlayerWrapper}
        videoSrc={getVideoSource()}
        posterSrc={previewMode ? '' : getCoverImageUrl(currentVideoId!, currentSceneStartTime)}
        scenes={timelineScenes}
        transcriptionSegments={transcriptionSegments}
        videoDuration={projectDuration}
        originalVideoDuration={getOriginalVideoDuration()}
        videoId={currentVideoId || ''}
        isProject={true}
        showVideoControls={true}
        canUndo={canUndoBackend}
        canRedo={canRedoBackend}
        canSplit={!!currentScene && currentSceneDuration > 1}
        canAddScene={true}
        {showSearchModal}
        {searchQuery}
        {searchResults}
        {searching}
        on:seekTo
        on:sceneClick={(e) => handleSceneClick(e.detail)}
                on:sceneResize={(e) => handleSceneResize(e)}
                on:sceneResizeEnd={(e) => handleSceneResizeEnd(e)}
                on:sceneReorder={(e) => handleSceneReorder(e)}
        on:deleteScene={(e) => handleDeleteScene(e.detail)}
        on:audioTrackRegister={(e) => registerAudioTrack(e.detail)}
        on:audioTrackUnregister={(e) => unregisterAudioTrack(e.detail)}
        on:timeupdate={(e) => handleVideoTimeUpdate(e)}
        on:ended={(e) => handleVideoEnded(e)}
        on:undo={handleUndo}
        on:redo={handleRedo}
        on:split={handleSplit}
        on:addScene={handleAddScene}
        on:search={handleSearchEvent}
        on:searchInput={handleSearchInput}
        on:addSceneToProject={handleAddSceneToProject}
        on:closeSearchModal={handleCloseSearchModal}
      />
    {:else}
      <div class="glass-card text-center py-16">
        <div class="text-lg text-gray-400">
          {$currentLocale === 'en' ? 'No scenes added yet' : 'Noch keine Szenen hinzugefügt'}
        </div>
      </div>
    {/if}
  {:else}
    <div class="text-center py-12">
      <div class="text-lg text-red-500">Project not found</div>
    </div>
  {/if}
</div>

<style>
  @media (max-width: 768px) {
    .mb-4.flex.gap-4 {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    :global(.msqdx-button) {
      width: 100%;
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

    .icon-18px {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
