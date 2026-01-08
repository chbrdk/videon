"""
Zentrale Python-Konfigurationsdatei für alle Services
Lädt die Umgebungskonfiguration basierend auf ENVIRONMENT
"""

import json
import os
from pathlib import Path

# Lade die Umgebungskonfiguration
config_path = Path(__file__).parent / 'environment.json'
with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Bestimme die aktuelle Umgebung
environment = os.getenv('ENVIRONMENT', 'development')
current_config = config.get(environment, config['development'])

# Exportiere die Konfiguration
HOST = current_config['host']
PORTS = current_config['ports']
URLS = current_config['urls']
STORAGE = current_config['storage']

def get_service_url(service_name: str) -> str:
    """Hilfsfunktion um Service-URL zu erhalten"""
    return URLS.get(service_name, f"http://{HOST}:{PORTS[service_name]}")

def get_service_port(service_name: str) -> int:
    """Hilfsfunktion um Service-Port zu erhalten"""
    return PORTS[service_name]

def get_storage_path(storage_type: str) -> str:
    """Hilfsfunktion um Storage-Pfad zu erhalten"""
    return STORAGE.get(storage_type, STORAGE['basePath'])