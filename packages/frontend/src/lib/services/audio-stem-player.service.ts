/**
 * Audio Stem Player Service
 * Handles synchronized playback of separated audio stems
 */

export interface AudioStemTrack {
  id: string;
  stemType: 'vocals' | 'music' | 'original';
  audioElement: HTMLAudioElement;
  isMuted: boolean;
  volume: number; // 0-1
  startTime: number;
  endTime: number;
  duration: number;
}

export interface VoiceSegmentAudio {
  segmentId: string;
  audioElement: HTMLAudioElement;
  startTime: number;
  endTime: number;
  isPlaying: boolean;
}

export class AudioStemPlayerService {
  private tracks: Map<string, AudioStemTrack> = new Map();
  private voiceSegments: Map<string, VoiceSegmentAudio> = new Map();
  private isPlaying = false;
  private currentTime = 0;
  private videoElement: HTMLVideoElement | null = null;
  private timeUpdateInterval: number | null = null;

  constructor() {
    console.log('🎵 AudioStemPlayerService initialized');
  }

  /**
   * Register video element for synchronization
   */
  setVideoElement(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    console.log('🎵 Video element registered for audio sync');
  }

  /**
   * Add an audio stem track
   */
  async addTrack(stemId: string, stemType: 'vocals' | 'music' | 'original', audioUrl: string, startTime: number, endTime: number): Promise<void> {
    try {
      console.log(`🎵 Adding audio track: ${stemType} (${stemId})`);
      
      // Create audio element
      const audioElement = new Audio(audioUrl);
      audioElement.preload = 'auto';
      audioElement.crossOrigin = 'anonymous';
      
      // Wait for audio to be ready
      await new Promise<void>((resolve, reject) => {
        audioElement.addEventListener('canplaythrough', () => resolve(), { once: true });
        audioElement.addEventListener('error', (e) => reject(e), { once: true });
        audioElement.load();
      });

      const track: AudioStemTrack = {
        id: stemId,
        stemType,
        audioElement,
        isMuted: false,
        volume: 1.0,
        startTime,
        endTime,
        duration: endTime - startTime
      };

      this.tracks.set(stemId, track);
      console.log(`✅ Audio track added: ${stemType} (${stemId})`);
      
    } catch (error) {
      console.error(`❌ Failed to add audio track ${stemId}:`, error);
      throw error;
    }
  }

  /**
   * Remove an audio stem track
   */
  removeTrack(stemId: string): void {
    const track = this.tracks.get(stemId);
    if (track) {
      track.audioElement.pause();
      track.audioElement.src = '';
      this.tracks.delete(stemId);
      console.log(`🎵 Audio track removed: ${stemId}`);
    }
  }

  /**
   * Start synchronized playback
   */
  async play(): Promise<void> {
    if (!this.videoElement) {
      console.warn('🎵 No video element registered for sync');
      return;
    }

    console.log('🎵 Starting synchronized audio playback');
    this.isPlaying = true;

    // Mute video audio
    this.videoElement.muted = true;
    console.log('🔇 Video audio muted');

    // Start all audio tracks
    const playPromises: Promise<void>[] = [];
    
    for (const [stemId, track] of this.tracks) {
      if (!track.isMuted) {
        try {
          // Set current time to match video
          track.audioElement.currentTime = this.videoElement.currentTime;
          track.audioElement.volume = track.volume;
          
          const playPromise = track.audioElement.play();
          playPromises.push(playPromise);
          
          console.log(`🎵 Playing track: ${track.stemType} at ${this.videoElement.currentTime}s`);
        } catch (error) {
          console.error(`❌ Failed to play track ${stemId}:`, error);
        }
      }
    }

    // Wait for all tracks to start playing
    try {
      await Promise.all(playPromises);
      console.log('✅ All audio tracks started playing');
    } catch (error) {
      console.error('❌ Some audio tracks failed to start:', error);
    }

    // Start time synchronization
    this.startTimeSync();
  }

  /**
   * Pause synchronized playback
   */
  pause(): void {
    console.log('🎵 Pausing synchronized audio playback');
    this.isPlaying = false;

    // Pause all audio tracks
    for (const [stemId, track] of this.tracks) {
      track.audioElement.pause();
    }

    // Stop time synchronization
    this.stopTimeSync();
  }

  /**
   * Seek all tracks to a specific time
   */
  seekTo(time: number): void {
    console.log(`🎵 Seeking all tracks to ${time}s`);
    
    for (const [stemId, track] of this.tracks) {
      if (track.audioElement.duration > 0) {
        track.audioElement.currentTime = time;
      }
    }
  }

  /**
   * Set volume for a specific track
   */
  setTrackVolume(stemId: string, volume: number): void {
    const track = this.tracks.get(stemId);
    if (track) {
      track.volume = Math.max(0, Math.min(1, volume));
      track.audioElement.volume = track.volume;
      console.log(`🎵 Track ${track.stemType} volume set to ${(track.volume * 100).toFixed(1)}%`);
    }
  }

  /**
   * Mute/unmute a specific track
   */
  setTrackMuted(stemId: string, muted: boolean): void {
    const track = this.tracks.get(stemId);
    if (track) {
      track.isMuted = muted;
      track.audioElement.volume = muted ? 0 : track.volume;
      console.log(`🎵 Track ${track.stemType} ${muted ? 'muted' : 'unmuted'}`);
    }
  }

  /**
   * Get track information
   */
  getTrack(stemId: string): AudioStemTrack | undefined {
    return this.tracks.get(stemId);
  }

  /**
   * Get all tracks
   */
  getAllTracks(): AudioStemTrack[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Add a re-voiced voice segment for playback
   */
  addVoiceSegment(segmentId: string, audioUrl: string, startTime: number, endTime: number): void {
    try {
      console.log(`🎙️ Adding re-voiced segment: ${segmentId} (${startTime}-${endTime}s)`);
      
      const audioElement = new Audio(audioUrl);
      audioElement.preload = 'auto';
      audioElement.crossOrigin = 'anonymous';
      
      const segmentAudio: VoiceSegmentAudio = {
        segmentId,
        audioElement,
        startTime,
        endTime,
        isPlaying: false
      };
      
      this.voiceSegments.set(segmentId, segmentAudio);
      console.log(`✅ Re-voiced segment added: ${segmentId}`);
    } catch (error) {
      console.error(`❌ Failed to add re-voiced segment ${segmentId}:`, error);
    }
  }

  /**
   * Remove a voice segment
   */
  removeVoiceSegment(segmentId: string): void {
    const segment = this.voiceSegments.get(segmentId);
    if (segment) {
      segment.audioElement.pause();
      segment.audioElement.src = '';
      this.voiceSegments.delete(segmentId);
      console.log(`🎙️ Re-voiced segment removed: ${segmentId}`);
    }
  }

  /**
   * Start time synchronization with video
   */
  private startTimeSync(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }

    this.timeUpdateInterval = window.setInterval(() => {
      if (this.isPlaying && this.videoElement) {
        const videoTime = this.videoElement.currentTime;
        
        // Sync all audio tracks to video time
        for (const [stemId, track] of this.tracks) {
          if (!track.isMuted && Math.abs(track.audioElement.currentTime - videoTime) > 0.1) {
            track.audioElement.currentTime = videoTime;
          }
        }

        // Check if we should play re-voiced voice segments
        this.updateVoiceSegmentPlayback(videoTime);
      }
    }, 100); // Check every 100ms
  }

  /**
   * Update voice segment playback based on current time
   */
  private updateVoiceSegmentPlayback(videoTime: number): void {
    for (const [segmentId, segment] of this.voiceSegments) {
      const isInSegment = videoTime >= segment.startTime && videoTime <= segment.endTime;
      
      if (isInSegment && !segment.isPlaying) {
        // Start playing the re-voiced segment
        console.log(`🎙️ Playing re-voiced segment ${segmentId} at ${videoTime}s`);
        segment.isPlaying = true;
        
        // Calculate offset into the segment
        const offset = videoTime - segment.startTime;
        segment.audioElement.currentTime = offset;
        segment.audioElement.volume = 1.0;
        segment.audioElement.play().catch(error => {
          console.error(`❌ Failed to play re-voiced segment ${segmentId}:`, error);
        });

        // Mute the original vocals track during this segment
        for (const [stemId, track] of this.tracks) {
          if (track.stemType === 'vocals' && !track.isMuted) {
            track.audioElement.volume = 0;
          }
        }
      } else if (!isInSegment && segment.isPlaying) {
        // Stop playing the re-voiced segment
        console.log(`🎙️ Stopping re-voiced segment ${segmentId} at ${videoTime}s`);
        segment.isPlaying = false;
        segment.audioElement.pause();
        segment.audioElement.currentTime = 0;

        // Unmute the original vocals track
        for (const [stemId, track] of this.tracks) {
          if (track.stemType === 'vocals' && !track.isMuted) {
            track.audioElement.volume = track.volume;
          }
        }
      }
    }
  }

  /**
   * Stop time synchronization
   */
  private stopTimeSync(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    console.log('🎵 Destroying AudioStemPlayerService');
    
    this.pause();
    this.stopTimeSync();
    
    // Clean up all audio elements
    for (const [stemId, track] of this.tracks) {
      track.audioElement.pause();
      track.audioElement.src = '';
    }
    
    this.tracks.clear();
    this.videoElement = null;
  }
}

// Singleton instance
export const audioStemPlayer = new AudioStemPlayerService();
