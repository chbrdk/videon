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

// Internal Docker hostnames (backend, frontend, etc.) are NOT reachable from the browser
const isInternalDockerUrl = (url: string) =>
  !url || /^(https?:\/\/)?(backend|frontend|postgres|redis|analyzer)(:\d+)?(\/|$)/i.test(url);

// Runtime detection: In browser, prefer same-origin when build URL is internal Docker
const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    // Internal Docker URL (e.g. http://backend:4001) → use same-origin (Coolify proxies /api)
    if (BACKEND_URL_BUILD_TIME && isInternalDockerUrl(BACKEND_URL_BUILD_TIME)) {
      return ''; // '' → api.baseUrl = '/api' (relative, same-origin)
    }
    if (BACKEND_URL_BUILD_TIME && !isInternalDockerUrl(BACKEND_URL_BUILD_TIME)) {
      return BACKEND_URL_BUILD_TIME;
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:4001`;
    }
    return ''; // Production: same-origin /api
  }
  return BACKEND_URL_BUILD_TIME || 'http://localhost:4001';
};

const BACKEND_URL = getBackendUrl();

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
    frontend: 'http://localhost:3010',
    analyzer: 'http://localhost:8004',
    audioService: 'http://localhost:5680',
    audioSeparationService: 'http://localhost:8006',
    saliencyService: 'http://localhost:8005',
    visionService: 'http://localhost:8004'
  },
  storage: {
    basePath: '/Volumes/DOCKER_EXTERN/videon/storage',
    audioStems: '/Volumes/DOCKER_EXTERN/videon/storage/audio_stems',
    videos: '/Volumes/DOCKER_EXTERN/videon/storage/videos',
    keyframes: '/Volumes/DOCKER_EXTERN/videon/storage/keyframes'
  }
};

// Frontend-spezifische APIs
// If accessed via /videon, API path should be /videon/api (proxied by Nginx)
// Otherwise use direct backend URL (development)
// Frontend-spezifische APIs
const getApiBaseUrl = () => {
  return `${config.urls.backend}/api`;
};

export const api = {
  baseUrl: getApiBaseUrl(),
  videos: `${getApiBaseUrl()}/videos`,
  projects: `${getApiBaseUrl()}/projects`,
  audioStems: `${getApiBaseUrl()}/audio-stems`,
  search: `${getApiBaseUrl()}/search`,
  folders: `${getApiBaseUrl()}/folders`,
  health: `${getApiBaseUrl()}/health`
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

