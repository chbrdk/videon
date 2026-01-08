import { api } from '../config/environment';

const API_BASE = api.baseUrl;

export interface VoiceSegment {
  id: string;
  audioStemId: string;
  startTime: number;
  endTime: number;
  duration: number;
  originalText: string;
  originalFilePath: string;
  editedText: string | null;
  voiceId: string | null;
  voiceName: string | null;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  reVoicedFilePath: string | null;
  reVoicedAudioUrl: string | null;
  reVoicedAt: string | null;
  status: 'ORIGINAL' | 'EDITED_TEXT' | 'GENERATING' | 'COMPLETED' | 'ERROR';
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceClone {
  id: string;
  name: string;
  description: string | null;
  elevenLabsVoiceId: string;
  sourceAudioPath: string | null;
  language: string | null;
  gender: string | null;
  ageRange: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples?: any[];
  category?: string;
  description?: string;
}

export const voiceSegmentApi = {
  async createSegments(audioStemId: string, videoId: string): Promise<VoiceSegment[]> {
    const response = await fetch(
      `${API_BASE}/audio-stems/${audioStemId}/create-segments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create segments');
    }

    const { segments } = await response.json();
    return segments;
  },

  async getSegments(audioStemId: string): Promise<VoiceSegment[]> {
    const response = await fetch(
      `${API_BASE}/audio-stems/${audioStemId}/segments`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch segments');
    }

    const segments = await response.json();
    // Add streaming URL for re-voiced segments
    return segments.map((segment: VoiceSegment) => ({
      ...segment,
      reVoicedAudioUrl: segment.reVoicedFilePath 
        ? `${API_BASE}/voice-segments/${segment.id}/revoiced-audio`
        : null
    }));
  },

  async updateSegmentText(segmentId: string, text: string): Promise<VoiceSegment> {
    const response = await fetch(
      `${API_BASE}/voice-segments/${segmentId}/text`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update text');
    }

    return response.json();
  },

  async reVoiceSegment(
    segmentId: string,
    options: {
      voiceId: string;
      text?: string;
      voiceSettings?: {
        stability: number;
        similarityBoost: number;
        style: number;
        useSpeakerBoost: boolean;
      };
    }
  ): Promise<VoiceSegment> {
    const response = await fetch(
      `${API_BASE}/voice-segments/${segmentId}/revoice`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to re-voice segment');
    }

    return response.json();
  },

  async previewVoice(options: {
    text: string;
    voiceId: string;
    voiceSettings: any;
  }): Promise<string> {
    const response = await fetch(`${API_BASE}/voice-segments/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Preview failed');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  async getVoices(): Promise<ElevenLabsVoice[]> {
    const response = await fetch(`${API_BASE}/voices`);

    if (!response.ok) {
      // Return empty array on error
      return [];
    }

    return response.json();
  },

  async cloneVoice(options: {
    name: string;
    audioFilePath: string;
    description?: string;
  }): Promise<VoiceClone> {
    const response = await fetch(`${API_BASE}/voices/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to clone voice');
    }

    return response.json();
  },

  async getVoiceClones(): Promise<VoiceClone[]> {
    const response = await fetch(`${API_BASE}/voices/clones`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch voice clones');
    }

    return response.json();
  }
};
