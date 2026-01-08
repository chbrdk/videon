/**
 * Zentrale Konfigurationsdatei für alle Services
 * Lädt die Umgebungskonfiguration basierend auf NODE_ENV
 */

const fs = require('fs');
const path = require('path');

// Lade die Umgebungskonfiguration
const configPath = path.join(__dirname, 'environment.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Bestimme die aktuelle Umgebung
const environment = process.env.NODE_ENV || 'development';
const currentConfig = config[environment] || config.development;

// Exportiere die Konfiguration
module.exports = {
  environment,
  host: currentConfig.host,
  ports: currentConfig.ports,
  urls: currentConfig.urls,
  storage: currentConfig.storage,
  
  // Hilfsfunktionen
  getServiceUrl: (serviceName) => {
    return currentConfig.urls[serviceName] || `http://${currentConfig.host}:${currentConfig.ports[serviceName]}`;
  },
  
  getServicePort: (serviceName) => {
    return currentConfig.ports[serviceName];
  },
  
  getStoragePath: (type) => {
    return currentConfig.storage[type] || currentConfig.storage.basePath;
  }
};