"use strict";
/**
 * Zentrale TypeScript-Konfigurationsdatei für alle Services
 * Lädt die Umgebungskonfiguration basierend auf NODE_ENV
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoragePath = exports.getServicePort = exports.getServiceUrl = exports.config = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Lade die Umgebungskonfiguration
const configPath = path.join(__dirname, 'environment.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
// Bestimme die aktuelle Umgebung
const environment = process.env.NODE_ENV || 'development';
const currentConfig = config[environment] || config.development;
// Exportiere die Konfiguration
exports.config = {
    environment,
    host: currentConfig.host,
    ports: currentConfig.ports,
    urls: currentConfig.urls,
    storage: currentConfig.storage,
};
// Hilfsfunktionen
const getServiceUrl = (serviceName) => {
    return currentConfig.urls[serviceName] || `http://${currentConfig.host}:${currentConfig.ports[serviceName]}`;
};
exports.getServiceUrl = getServiceUrl;
const getServicePort = (serviceName) => {
    return currentConfig.ports[serviceName];
};
exports.getServicePort = getServicePort;
const getStoragePath = (storageType) => {
    return currentConfig.storage[storageType] || currentConfig.storage.basePath;
};
exports.getStoragePath = getStoragePath;
//# sourceMappingURL=environment.js.map