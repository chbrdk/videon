import axios, { AxiosInstance } from 'axios';

export interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples?: any[];
  category?: string;
  description?: string;
}

export class ElevenLabsClient {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private axiosInstance: AxiosInstance;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'xi-api-key': apiKey
      }
    });
  }

  /**
   * Liste verfügbare Stimmen
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const response = await this.axiosInstance.get('/voices');
      return response.data.voices;
    } catch (error) {
      console.error('Error fetching voices:', error);
      // Return empty array on error to prevent blocking
      return [];
    }
  }

  /**
   * Text-to-Speech mit spezifischer Voice
   */
  async textToSpeech(options: {
    text: string;
    voiceId: string;
    settings: VoiceSettings;
  }): Promise<Buffer> {
    const response = await this.axiosInstance.post(
      `/text-to-speech/${options.voiceId}`,
      {
        text: options.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.settings.stability,
          similarity_boost: options.settings.similarityBoost,
          style: options.settings.style || 0,
          use_speaker_boost: options.settings.useSpeakerBoost !== false
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  }

  /**
   * Voice Cloning aus Audio-Samples
   */
  async cloneVoice(options: {
    name: string;
    files: Buffer[];
    description?: string;
  }): Promise<string> {
    // TODO: Implement actual voice cloning API call
    // For now, return a placeholder
    throw new Error('Voice cloning not yet implemented. Please use existing voices.');
  }

  /**
   * Stream Audio für Live-Preview
   */
  async streamTextToSpeech(options: {
    text: string;
    voiceId: string;
    settings: VoiceSettings;
  }): Promise<any> {
    const response = await this.axiosInstance.post(
      `/text-to-speech/${options.voiceId}/stream`,
      {
        text: options.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.settings.stability,
          similarity_boost: options.settings.similarityBoost,
          style: options.settings.style || 0,
          use_speaker_boost: options.settings.useSpeakerBoost !== false
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    return response.data;
  }
}
