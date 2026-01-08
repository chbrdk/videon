/**
 * Zentrale TypeScript-Konfigurationsdatei für alle Services
 * Lädt die Umgebungskonfiguration basierend auf NODE_ENV
 */

import * as fs from 'fs';
import * as path from 'path';

// Lade die Umgebungskonfiguration
const configPath = path.join(__dirname, 'environment.json');
const envConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Bestimme die aktuelle Umgebung
const environment = process.env.NODE_ENV || 'development';
const currentConfig = envConfig[environment] || envConfig.development;

// TypeScript-Interfaces
export interface ServiceConfig {
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

// Exportiere die Konfiguration
export const environmentConfig: ServiceConfig = {
  host: currentConfig.host,
  ports: currentConfig.ports,
  urls: currentConfig.urls,
  storage: currentConfig.storage,
} as ServiceConfig;

export const environmentName = environment;

// Hilfsfunktionen
export const getServiceUrl = (serviceName: keyof ServiceConfig['urls']): string => {
  return currentConfig.urls[serviceName] || `http://${currentConfig.host}:${currentConfig.ports[serviceName]}`;
};

export const getServicePort = (serviceName: keyof ServiceConfig['ports']): number => {
  return currentConfig.ports[serviceName];
};

export const getStoragePath = (storageType: keyof ServiceConfig['storage']): string => {
  return currentConfig.storage[storageType] || currentConfig.storage.basePath;
};
