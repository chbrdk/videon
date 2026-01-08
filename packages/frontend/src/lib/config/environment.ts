/**
 * Frontend-spezifische Konfiguration
 * Importiert die zentrale Konfiguration und erweitert sie für Frontend-spezifische Bedürfnisse
 */

export interface Config {
  environment: string;
  host: string;
  ports: {
    backend: number;
    frontend: number;
    analyzer: number;
    audioService: number;
    audioSeparationService: number;
    saliencyService: number;
    visionService: number;
  };
  urls: {
    backend: string;
    frontend: string;
    analyzer: string;
    audioService: string;
    audioSeparationService: string;
    saliencyService: string;
    visionService: string;
  };
  storage: {
    basePath: string;
    audioStems: string;
    videos: string;
    keyframes: string;
  };
}

// Get backend URL - Priority: Build-time env var > Runtime detection > localhost fallback
// Vite replaces import.meta.env.PUBLIC_BACKEND_URL at build time if the env var is set
const BACKEND_URL_BUILD_TIME = import.meta.env.PUBLIC_BACKEND_URL;

// Runtime detection: Always use browser's hostname (even if localhost) to ensure consistency
// If user accesses via IP, use IP. If via localhost, use localhost.
const BACKEND_URL = BACKEND_URL_BUILD_TIME || 
  (typeof window !== 'undefined' 
    ? `http://${window.location.hostname}:4001`
    : 'http://localhost:4001');

// Zentrale Konfiguration - Development
const config: Config = {
  environment: 'development',
  host: 'localhost',
  ports: {
    backend: 4001,
    frontend: 3003,
    analyzer: 8001,
    audioService: 5679,
    audioSeparationService: 8003,
    saliencyService: 8002,
    visionService: 8004
  },
  urls: {
    backend: BACKEND_URL,
    frontend: 'http://localhost:3003',
    analyzer: 'http://localhost:8001',
    audioService: 'http://localhost:5679',
    audioSeparationService: 'http://localhost:8003',
    saliencyService: 'http://localhost:8002',
    visionService: 'http://localhost:8004'
  },
  storage: {
    basePath: '/Volumes/DOCKER_EXTERN/prismvid/storage',
    audioStems: '/Volumes/DOCKER_EXTERN/prismvid/storage/audio_stems',
    videos: '/Volumes/DOCKER_EXTERN/prismvid/storage/videos',
    keyframes: '/Volumes/DOCKER_EXTERN/prismvid/storage/keyframes'
  }
};

// Frontend-spezifische APIs
export const api = {
  baseUrl: `${config.urls.backend}/api`,
  videos: `${config.urls.backend}/api/videos`,
  projects: `${config.urls.backend}/api/projects`,
  audioStems: `${config.urls.backend}/api/audio-stems`,
  search: `${config.urls.backend}/api/search`,
  folders: `${config.urls.backend}/api/folders`,
  health: `${config.urls.backend}/api/health`
};

// Hilfsfunktionen für Frontend
export const getVideoUrl = (videoId: string): string => {
  return `${api.videos}/${videoId}/file`;
};

export const getCoverImageUrl = (videoId: string, startTime: number): string => {
  return `${api.videos}/${videoId}/thumbnail?t=${Math.floor(startTime)}`;
};

export const getAudioStemUrl = (stemId: string): string => {
  return `${api.audioStems}/${stemId}/stream`;
};

export const getProjectUrl = (projectId: string, endpoint: string = ''): string => {
  return `${api.projects}/${projectId}${endpoint}`;
};

export { config };

