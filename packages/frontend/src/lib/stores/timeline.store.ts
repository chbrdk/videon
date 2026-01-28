import { writable, derived, get } from 'svelte/store';
import { api } from '$lib/config/environment';

// Timeline Store for managing video timeline state and clip operations

// Audio clips store for managing audio stem clips
export const audioClips = writable<AudioStemClip[]>([]);

export interface AudioStemClip {
  id: string;
  audioStemId: string;
  stemType: 'vocals' | 'music' | 'original' | 'drums' | 'bass';
  startTime: number;
  endTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  audioLevel: number;
  isSelected: boolean;
  isMuted: boolean;
  showWaveform: boolean;
  order: number;
  sceneId?: string; // Add sceneId for matching with scenes
}

export interface TimelineClip {
  id: string;
  sceneId: string;
  startTime: number;
  endTime: number;
  duration: number;
  order: number;
  color?: string;
  thumbnail?: string;
  locked?: boolean;
  muted?: boolean;
}

export interface SceneData {
  sceneId: string;
  startTime: number;
  endTime: number;
  duration: number;
  keyframePath?: string;
  objects?: any[];
  faces?: any[];
  sceneClassification?: any[];
  aiDescription?: string;
  aiTags?: string[];
}

// Track Configuration for Multi-Track Timeline
export interface TrackConfig {
  id: string;
  type: 'scenes' | 'transcription' | 'waveform' | 'markers' | 'audio-vocals' | 'audio-music' | 'audio-original' | 'voice-segments';
  label: string;
  height: number;
  visible: boolean;
  locked: boolean;
  order: number;
  audioStemId?: string; // Reference to AudioStem
  stemType?: 'vocals' | 'music' | 'original' | 'drums' | 'bass';
}

// Core timeline state
export const timelineClips = writable<TimelineClip[]>([]);
export const audioStemClips = writable<AudioStemClip[]>([]);
export const selectedClip = writable<string | null>(null);
export const selectedAudioStem = writable<string | null>(null);
export const currentTime = writable<number>(0);
export const duration = writable<number>(0);
export const zoomLevel = writable<number>(1.0);
export const isPlaying = writable<boolean>(false);
export const isDragging = writable<boolean>(false);

// Audio Stem Visibility Controls
export const showAudioStems = writable<boolean>(true);
export const audioStemMode = writable<'all' | 'vocals' | 'music' | 'original'>('all');
export const showWaveforms = writable<boolean>(true);

// Multi-Track Timeline State
export const trackConfigs = writable<TrackConfig[]>([
  { id: 'scenes', type: 'scenes', label: 'Video Scenes', height: 100, visible: true, locked: false, order: 0 },
  { id: 'transcription', type: 'transcription', label: 'Transcription', height: 60, visible: true, locked: false, order: 1 },
  { id: 'audio-vocals', type: 'audio-vocals', label: 'Voice (Vocals)', height: 80, visible: false, locked: false, order: 2, stemType: 'vocals' },
  { id: 'audio-music', type: 'audio-music', label: 'Music', height: 80, visible: false, locked: false, order: 3, stemType: 'music' },
  { id: 'audio-original', type: 'audio-original', label: 'Original Audio', height: 80, visible: false, locked: false, order: 4, stemType: 'original' },
  { id: 'voice-segments', type: 'voice-segments', label: 'Voice Segments', height: 100, visible: false, locked: false, order: 5 }
]);

export const autoScroll = writable<boolean>(true);
export const playheadPosition = writable<number>(0);

// Playhead Update Function
export function updatePlayhead(currentTime: number, duration: number, containerWidth: number, zoomLevel: number) {
  const position = (currentTime / duration) * containerWidth * zoomLevel;
  playheadPosition.set(position);
}

// Smooth Playhead Animation
let animationFrameId: number | null = null;

export function startPlayheadAnimation(
  videoElement: HTMLVideoElement,
  videoDuration: number,
  containerWidth: number
) {
  function animate() {
    if (videoElement && !videoElement.paused) {
      const time = videoElement.currentTime;
      const zoom = get(zoomLevel);
      updatePlayhead(time, videoDuration, containerWidth, zoom);
    }
    animationFrameId = requestAnimationFrame(animate);
  }

  animate();
}

export function stopPlayheadAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// Timeline operations
export const timelineOperations = {
  // Initialize clips from scene data
  initializeClips: (scenes: SceneData[]) => {
    const clips: TimelineClip[] = scenes.map((scene, index) => ({
      id: `clip-${scene.sceneId}`,
      sceneId: scene.sceneId,
      startTime: scene.startTime,
      endTime: scene.endTime,
      duration: scene.endTime - scene.startTime,
      order: index,
      color: getRandomColor(),
      thumbnail: scene.keyframePath,
      locked: false,
      muted: false
    }));

    timelineClips.set(clips);
    console.log('✅ Timeline clips initialized:', clips.length);
  },

  // Select a clip
  selectClip: (clipId: string) => {
    selectedClip.set(clipId);
    console.log('🎯 Selected clip:', clipId);
  },

  // Update current playback time
  updateCurrentTime: (time: number) => {
    currentTime.set(time);
  },

  // Set playing state
  setPlaying: (playing: boolean) => {
    isPlaying.set(playing);
  },

  // Update zoom level
  setZoomLevel: (zoom: number) => {
    zoomLevel.set(Math.max(0.1, Math.min(5.0, zoom)));
  },

  // Split a clip at a specific time
  splitClip: (clipId: string, splitTime: number) => {
    timelineClips.update(clips => {
      const clipIndex = clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return clips;

      const clip = clips[clipIndex];
      if (splitTime <= clip.startTime || splitTime >= clip.endTime) {
        console.warn('Split time must be within clip bounds');
        return clips;
      }

      // Create two new clips
      const clip1: TimelineClip = {
        ...clip,
        id: `clip-${clip.sceneId}-1`,
        endTime: splitTime,
        duration: splitTime - clip.startTime
      };

      const clip2: TimelineClip = {
        ...clip,
        id: `clip-${clip.sceneId}-2`,
        startTime: splitTime,
        duration: clip.endTime - splitTime,
        order: clip.order + 1
      };

      // Update order of subsequent clips
      const newClips = [...clips];
      newClips.splice(clipIndex, 1, clip1, clip2);

      // Update order numbers
      newClips.forEach((c, i) => {
        c.order = i;
      });

      console.log('✂️ Clip split:', clipId, 'at', splitTime);
      return newClips;
    });
  },

  // Delete a clip
  deleteClip: (clipId: string) => {
    timelineClips.update(clips => {
      const newClips = clips.filter(c => c.id !== clipId);
      // Update order numbers
      newClips.forEach((c, i) => {
        c.order = i;
      });

      // Clear selection if deleted clip was selected
      selectedClip.update(selected => selected === clipId ? null : selected);

      console.log('🗑️ Clip deleted:', clipId);
      return newClips;
    });
  },

  // Merge two adjacent clips
  mergeClips: (clipId1: string, clipId2: string) => {
    timelineClips.update(clips => {
      const clip1Index = clips.findIndex(c => c.id === clipId1);
      const clip2Index = clips.findIndex(c => c.id === clipId2);

      if (clip1Index === -1 || clip2Index === -1) {
        console.warn('One or both clips not found for merge');
        return clips;
      }

      const clip1 = clips[clip1Index];
      const clip2 = clips[clip2Index];

      // Check if clips are adjacent
      if (Math.abs(clip1Index - clip2Index) !== 1) {
        console.warn('Clips must be adjacent to merge');
        return clips;
      }

      // Create merged clip
      const mergedClip: TimelineClip = {
        id: `merged-${clip1.sceneId}-${clip2.sceneId}`,
        sceneId: clip1.sceneId, // Use first clip's scene ID
        startTime: Math.min(clip1.startTime, clip2.startTime),
        endTime: Math.max(clip1.endTime, clip2.endTime),
        duration: Math.max(clip1.endTime, clip2.endTime) - Math.min(clip1.startTime, clip2.startTime),
        order: Math.min(clip1.order, clip2.order),
        color: clip1.color,
        thumbnail: clip1.thumbnail,
        locked: clip1.locked || clip2.locked,
        muted: clip1.muted || clip2.muted
      };

      // Remove original clips and add merged clip
      const newClips = clips.filter(c => c.id !== clipId1 && c.id !== clipId2);
      newClips.push(mergedClip);

      // Sort by order and update order numbers
      newClips.sort((a, b) => a.order - b.order);
      newClips.forEach((c, i) => {
        c.order = i;
      });

      console.log('🤝 Clips merged:', clipId1, clipId2);
      return newClips;
    });
  },

  // Move a clip to a new position
  moveClip: (clipId: string, newOrder: number) => {
    timelineClips.update(clips => {
      const clipIndex = clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return clips;

      const newClips = [...clips];
      const [clip] = newClips.splice(clipIndex, 1);

      // Insert at new position
      newClips.splice(newOrder, 0, clip);

      // Update order numbers
      newClips.forEach((c, i) => {
        c.order = i;
      });

      console.log('🔄 Clip moved:', clipId, 'to position', newOrder);
      return newClips;
    });
  },

  // Update clip properties
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => {
    timelineClips.update(clips => {
      const clipIndex = clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return clips;

      const newClips = [...clips];
      newClips[clipIndex] = { ...newClips[clipIndex], ...updates };

      console.log('📝 Clip updated:', clipId, updates);
      return newClips;
    });
  },

  // Lock/unlock a clip
  toggleClipLock: (clipId: string) => {
    timelineClips.update(clips => {
      const clipIndex = clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return clips;

      const newClips = [...clips];
      newClips[clipIndex].locked = !newClips[clipIndex].locked;

      console.log('🔒 Clip lock toggled:', clipId, newClips[clipIndex].locked);
      return newClips;
    });
  },

  // Mute/unmute a clip
  toggleClipMute: (clipId: string) => {
    timelineClips.update(clips => {
      const clipIndex = clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return clips;

      const newClips = [...clips];
      newClips[clipIndex].muted = !newClips[clipIndex].muted;

      console.log('🔇 Clip mute toggled:', clipId, newClips[clipIndex].muted);
      return newClips;
    });
  },

  // Clear all clips
  clearClips: () => {
    timelineClips.set([]);
    selectedClip.set(null);
    console.log('🧹 All clips cleared');
  },

  // Reset timeline
  reset: () => {
    timelineClips.set([]);
    selectedClip.set(null);
    currentTime.set(0);
    zoomLevel.set(1.0);
    isPlaying.set(false);
    isDragging.set(false);
    console.log('🔄 Timeline reset');
  }
};

// Derived stores for computed values
export const selectedClipData = derived(
  [timelineClips, selectedClip],
  ([clips, selected]) => {
    if (!selected) return null;
    return clips.find(c => c.id === selected) || null;
  }
);

export const totalDuration = derived(
  timelineClips,
  clips => {
    if (clips.length === 0) return 0;
    return Math.max(...clips.map(c => c.endTime));
  }
);

export const clipCount = derived(
  timelineClips,
  clips => clips.length
);

export const lockedClips = derived(
  timelineClips,
  clips => clips.filter(c => c.locked)
);

export const mutedClips = derived(
  timelineClips,
  clips => clips.filter(c => c.muted)
);

// Helper functions
function getRandomColor(): string {
  const colors = [
    'rgba(255, 107, 107, 0.3)', // Red
    'rgba(107, 255, 107, 0.3)', // Green
    'rgba(107, 107, 255, 0.3)', // Blue
    'rgba(255, 255, 107, 0.3)', // Yellow
    'rgba(255, 107, 255, 0.3)', // Magenta
    'rgba(107, 255, 255, 0.3)', // Cyan
    'rgba(255, 165, 0, 0.3)',    // Orange
    'rgba(128, 0, 128, 0.3)',    // Purple
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Audio Stem Management
export const audioStemOperations = {
  // Load audio stems for a single video
  loadAudioStems: async (videoId: string) => {
    try {
      console.log('🎵 Loading audio stems for video:', videoId);
      const response = await fetch(`${api.baseUrl}/videos/${videoId}/audio-stems`);

      if (response.ok) {
        const audioStems = await response.json();
        console.log('🎵 Loaded audio stems for video:', audioStems);

        // Add duration if missing (fetch video details if needed)
        // For now, assume stems might need duration from video or calculated

        // Convert to AudioStemClips
        const audioStemClipsData: AudioStemClip[] = audioStems.map((stem: any, index: number) => {
          const startTime = stem.startTime || 0;
          const endTime = stem.endTime || stem.duration || 0;
          const duration = endTime > startTime ? endTime - startTime : 0;

          return {
            id: `stem-clip-${stem.id}`,
            audioStemId: stem.id,
            stemType: stem.stemType,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            trimStart: 0,
            trimEnd: 1,
            audioLevel: 1.0,
            isSelected: false,
            isMuted: false,
            showWaveform: true,
            order: index,
            sceneId: stem.sceneId
          };
        });

        audioStemClips.set(audioStemClipsData);
        audioTrackOperations.showAudioTracks(audioStems);
      }
    } catch (error) {
      console.error('Failed to load audio stems:', error);
    }
  },

  // Load audio stems for project
  loadAudioStemsForProject: async (projectId: string) => {
    try {
      // Zuerst versuche Scene-spezifische Audio-Stems zu laden
      const response = await fetch(`${api.baseUrl}/projects/${projectId}/audio-stems`);
      let audioStems = [];

      if (response.ok) {
        audioStems = await response.json();
        console.log('🎵 Loaded scene-specific audio stems for project:', audioStems);
      }

      // Falls keine Scene-spezifischen Stems vorhanden, lade Video-spezifische Stems
      if (audioStems.length === 0) {
        console.log('🎵 No scene-specific stems found, loading video-specific stems...');

        // Hole Project-Daten um Video-IDs zu bekommen
        const projectResponse = await fetch(`${api.baseUrl}/projects/${projectId}`);
        if (projectResponse.ok) {
          const project = await projectResponse.json();

          if (project.scenes && project.scenes.length > 0) {
            // Sammle alle Audio-Stems von allen Videos im Project
            const allStems = [];
            const uniqueVideoIds = [...new Set(project.scenes.map((scene: any) => scene.videoId))];

            for (const videoId of uniqueVideoIds) {
              try {
                const videoStemsResponse = await fetch(`${api.baseUrl}/videos/${videoId}/audio-stems`);
                if (videoStemsResponse.ok) {
                  const videoStems = await videoStemsResponse.json();
                  allStems.push(...videoStems);
                }
              } catch (error) {
                console.warn(`Failed to load audio stems for video ${videoId}:`, error);
              }
            }

            audioStems = allStems;
            console.log('🎵 Loaded video-specific audio stems for project:', audioStems);

            // Füge Video-Duration zu den Stems hinzu
            if (audioStems.length > 0) {
              // Hole Video-Duration vom ersten Video
              const firstVideoId = uniqueVideoIds[0];
              try {
                const videoResponse = await fetch(`${api.baseUrl}/videos/${firstVideoId}`);
                if (videoResponse.ok) {
                  const videoData = await videoResponse.json();

                  // Berechne Video-Duration aus Scenes falls nicht verfügbar
                  let videoDuration = videoData.duration || 0;
                  if (videoDuration === 0 && videoData.scenes && videoData.scenes.length > 0) {
                    videoDuration = Math.max(...videoData.scenes.map((scene: any) => scene.endTime));
                    console.log('🎵 Calculated video duration from scenes:', videoDuration);
                  }

                  // Setze Duration für alle Stems ohne Duration
                  audioStems = audioStems.map(stem => ({
                    ...stem,
                    duration: stem.duration || videoDuration,
                    endTime: stem.endTime || videoDuration
                  }));

                  console.log('🎵 Added video duration to audio stems:', videoDuration);
                }
              } catch (error) {
                console.warn('Failed to get video duration:', error);
              }
            }
          }
        }
      }

      // Konvertiere zu AudioStemClips
      const audioStemClipsData: AudioStemClip[] = audioStems.map((stem: any, index: number) => {
        // Für Video-spezifische Stems ohne Scene-Timerange, verwende die gesamte Video-Duration
        const startTime = stem.startTime || 0;
        const endTime = stem.endTime || stem.duration || 0;
        const duration = endTime > startTime ? endTime - startTime : 0;

        return {
          id: `stem-clip-${stem.id}`,
          audioStemId: stem.id,
          stemType: stem.stemType,
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          trimStart: 0,
          trimEnd: 1,
          audioLevel: 1.0,
          isSelected: false,
          isMuted: false,
          showWaveform: true,
          order: index
        };
      });

      audioStemClips.set(audioStemClipsData);

      // Aktualisiere Track-Konfiguration
      audioTrackOperations.showAudioTracks(audioStems);

    } catch (error) {
      console.error('Failed to load audio stems:', error);
    }
  },

  // Update audio stem timing
  updateAudioStemTiming: (stemId: string, trimStart: number, trimEnd: number) => {
    audioStemClips.update(clips => {
      return clips.map(clip => {
        if (clip.audioStemId === stemId) {
          return { ...clip, trimStart, trimEnd };
        }
        return clip;
      });
    });
  },

  // Update audio stem level
  updateAudioStemLevel: (stemId: string, audioLevel: number) => {
    audioStemClips.update(clips => {
      return clips.map(clip => {
        if (clip.audioStemId === stemId) {
          return { ...clip, audioLevel };
        }
        return clip;
      });
    });
  },

  // Toggle audio stem mute
  toggleAudioStemMute: (stemId: string) => {
    audioStemClips.update(clips => {
      return clips.map(clip => {
        if (clip.audioStemId === stemId) {
          return { ...clip, isMuted: !clip.isMuted };
        }
        return clip;
      });
    });
  },

  // Isolate audio stem (mute all others)
  isolateAudioStem: (stemId: string) => {
    console.log('🎵 Isolating audio stem:', stemId);
    audioStemClips.update(clips => {
      return clips.map(clip => ({
        ...clip,
        isMuted: clip.audioStemId !== stemId
      }));
    });
  },

  // Select audio stem
  selectAudioStem: (stemId: string) => {
    selectedAudioStem.set(stemId);
    audioStemClips.update(clips => {
      return clips.map(clip => ({
        ...clip,
        isSelected: clip.audioStemId === stemId
      }));
    });
  },

  // Clear audio stem selection
  clearAudioStemSelection: () => {
    selectedAudioStem.set(null);
    audioStemClips.update(clips => {
      return clips.map(clip => ({ ...clip, isSelected: false }));
    });
  },

  // Toggle audio stem visibility
  toggleAudioStemVisibility: () => {
    showAudioStems.update(visible => !visible);
  },

  // Set audio stem mode
  setAudioStemMode: (mode: 'all' | 'vocals' | 'music' | 'original') => {
    audioStemMode.set(mode);
  },

  // Toggle waveform visibility
  toggleWaveformVisibility: () => {
    showWaveforms.update(visible => !visible);
    audioStemClips.update(clips => {
      return clips.map(clip => ({ ...clip, showWaveform: !clip.showWaveform }));
    });
  }
};

// Audio Track Management
const audioTrackOperations = {
  // Show audio tracks after separation
  showAudioTracks: (audioStems: { id: string; stemType: string; sceneId?: string }[]) => {
    console.log('🎵 showAudioTracks called with:', audioStems.length, 'stems');
    console.log('🎵 First few stems:', audioStems.slice(0, 3));

    // Group stems by type and get the latest one for each type
    const latestStems = audioStems.reduce((acc, stem) => {
      if (!acc[stem.stemType] || stem.id > acc[stem.stemType].id) {
        acc[stem.stemType] = stem;
      }
      return acc;
    }, {} as Record<string, { id: string; stemType: string; sceneId?: string }>);

    console.log('🎵 Latest stems by type:', Object.keys(latestStems));

    trackConfigs.update(configs => {
      const newConfigs = [...configs];
      console.log('🎵 Current track configs:', newConfigs.length);

      // First, hide all audio tracks
      newConfigs.forEach(config => {
        if (config.type.startsWith('audio-')) {
          config.visible = false;
          config.audioStemId = undefined;
        }
      });

      // Then show only the separated tracks (vocals, music, original)
      Object.values(latestStems).forEach(stem => {
        const trackType = stem.stemType === 'vocals' ? 'audio-vocals' :
          stem.stemType === 'music' ? 'audio-music' :
            stem.stemType === 'original' ? 'audio-original' : null;

        if (trackType) {
          const configIndex = newConfigs.findIndex(c => c.type === trackType);

          console.log(`🎵 Processing stem ${stem.stemType} -> trackType ${trackType}, configIndex: ${configIndex}`);

          if (configIndex !== -1) {
            newConfigs[configIndex] = {
              ...newConfigs[configIndex],
              visible: true,
              audioStemId: stem.id
            };
            console.log(`✅ Updated track ${trackType} to visible with stemId ${stem.id}`);
          } else {
            console.log(`❌ Track type ${trackType} not found in configs`);
          }
        }
      });

      console.log('🎵 Updated track configs:', newConfigs.length);
      return newConfigs;
    });

    // Also update the audio clips store with only the latest stems for each type
    // We need to get scene data to set correct startTime and endTime
    console.log('🎵 Creating audio clips for latest stems only:', Object.keys(latestStems).length);

    // Create clips only for the latest stems (one per type)
    const clips = Object.values(latestStems).map((stem, index) => ({
      id: stem.id,
      audioStemId: stem.id,
      stemType: stem.stemType as 'vocals' | 'music' | 'original' | 'drums' | 'bass',
      startTime: 0, // Will be updated based on scene data
      endTime: 0,   // Will be updated based on scene data
      duration: 0,  // Will be updated based on scene data
      trimStart: 0,
      trimEnd: 0,
      audioLevel: 1.0,
      isSelected: false,
      isMuted: false,
      showWaveform: true,
      order: index,
      sceneId: stem.sceneId || undefined // Store the sceneId for matching (can be undefined for full-video stems)
    }));

    console.log('🎵 Setting audio clips:', clips.length);
    console.log('🎵 Clips details:', clips.map(c => ({ id: c.id, stemType: c.stemType, sceneId: c.sceneId })));
    audioClips.set(clips);

    // Verify the clips were set
    audioClips.subscribe(currentClips => {
      console.log('🎵 Audio clips store updated:', currentClips.length);
      console.log('🎵 First few clips:', currentClips.slice(0, 3));
    })();

    console.log('🎵 Audio clips created:', audioStems.length);
  },

  // Hide audio tracks
  hideAudioTracks: () => {
    trackConfigs.update(configs => {
      return configs.map(config => {
        if (config.type.startsWith('audio-')) {
          return { ...config, visible: false, audioStemId: undefined };
        }
        return config;
      });
    });
    audioClips.set([]); // Clear all audio clips
  },

  // Toggle audio track visibility
  toggleAudioTrack: (trackType: 'audio-vocals' | 'audio-music' | 'audio-original') => {
    trackConfigs.update(configs => {
      return configs.map(config => {
        if (config.type === trackType) {
          return { ...config, visible: !config.visible };
        }
        return config;
      });
    });
  },

  // Update audio clips with scene data
  updateAudioClipsWithScenes: (scenes: any[]) => {
    console.log('🎵 Updating audio clips with scene data:', scenes.length);
    console.log('🎵 Current audio clips before update:', get(audioClips).length);

    audioClips.update(clips => {
      console.log('🎵 Processing clips:', clips.length);
      return clips.map(clip => {
        console.log(`🎵 Processing clip ${clip.id}, sceneId: ${clip.sceneId}, stemType: ${clip.stemType}`);

        // If clip has no sceneId, it's a full-video stem - use video duration
        if (!clip.sceneId) {
          console.log(`🎵 Full-video stem ${clip.id} - using video duration`);
          // For full-video stems, we'll use the first scene's start time and last scene's end time
          if (scenes.length > 0) {
            const firstScene = scenes[0];
            const lastScene = scenes[scenes.length - 1];
            const updatedClip = {
              ...clip,
              startTime: firstScene.startTime || 0,
              endTime: lastScene.endTime || 0,
              duration: (lastScene.endTime || 0) - (firstScene.startTime || 0)
            };
            console.log(`🎵 Updated full-video clip ${clip.id}: ${updatedClip.startTime}-${updatedClip.endTime} (${updatedClip.duration}s)`);
            return updatedClip;
          }
          return clip;
        }

        // Find the scene that matches this clip's sceneId
        const scene = scenes.find(s => s.id === clip.sceneId);
        if (scene) {
          console.log(`🎵 Updating clip ${clip.id} with scene ${scene.id}: ${scene.startTime}-${scene.endTime}`);
          const updatedClip = {
            ...clip,
            startTime: scene.startTime || 0,
            endTime: scene.endTime || 0,
            duration: (scene.endTime || 0) - (scene.startTime || 0)
          };
          console.log(`🎵 Updated scene clip ${clip.id}: ${updatedClip.startTime}-${updatedClip.endTime} (${updatedClip.duration}s)`);
          return updatedClip;
        }

        console.log(`🎵 No scene found for clip ${clip.id} with sceneId ${clip.sceneId}`);
        return clip;
      });
    });

    // Log updated clips
    audioClips.subscribe(clips => {
      console.log('🎵 Updated audio clips:', clips.length);
      clips.forEach(clip => {
        console.log(`🎵 Clip ${clip.id}: ${clip.stemType}, ${clip.startTime}-${clip.endTime} (${clip.duration}s)`);
      });
    })();
  }
};

// Export timeline operations for easy access
export const {
  initializeClips,
  selectClip,
  updateCurrentTime,
  setPlaying,
  setZoomLevel,
  splitClip,
  deleteClip,
  mergeClips,
  moveClip,
  updateClip,
  toggleClipLock,
  toggleClipMute,
  clearClips,
  reset
} = timelineOperations;

// Export audioTrackOperations separately for easier access
export const { showAudioTracks, hideAudioTracks, toggleAudioTrack, updateAudioClipsWithScenes } = audioTrackOperations;

// Export audioStemOperations
export const { loadAudioStems, loadAudioStemsForProject, updateAudioStemTiming, updateAudioStemLevel, toggleAudioStemMute, isolateAudioStem, selectAudioStem, clearAudioStemSelection, toggleAudioStemVisibility, setAudioStemMode, toggleWaveformVisibility } = audioStemOperations;