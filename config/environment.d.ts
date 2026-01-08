/**
 * Zentrale TypeScript-Konfigurationsdatei für alle Services
 * Lädt die Umgebungskonfiguration basierend auf NODE_ENV
 */
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
export declare const config: ServiceConfig;
export declare const getServiceUrl: (serviceName: keyof ServiceConfig["urls"]) => string;
export declare const getServicePort: (serviceName: keyof ServiceConfig["ports"]) => number;
export declare const getStoragePath: (storageType: keyof ServiceConfig["storage"]) => string;
//# sourceMappingURL=environment.d.ts.map