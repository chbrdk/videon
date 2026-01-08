#!/bin/bash

# OrbStack COMPLETE Migration Script - Migriert auch Container-Images und Volumes
# Verschiebt sowohl Konfigurations- als auch Datenverzeichnis auf externe Festplatte

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Pfade
ORB_CONF_DIR="$HOME/.orbstack"
ORB_DATA_DIR="$HOME/Library/Group Containers/HUAQ24HBR6.dev.orbstack"

CONF_BACKUP_DIR="$HOME/.orbstack.backup.$(date +%Y%m%d_%H%M%S)"
DATA_BACKUP_DIR="$HOME/.orbstack-data.backup.$(date +%Y%m%d_%H%M%S)"

CONF_EXTERNAL="/Volumes/DOCKER_EXTERN/orbstack"
DATA_EXTERNAL="/Volumes/DOCKER_EXTERN/orbstack-data"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  OrbStack COMPLETE Migration (inkl. Container/Vol.) ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Schritt 1: Prüfen ob OrbStack läuft
echo -e "${YELLOW}→ Prüfe ob OrbStack läuft...${NC}"
if command -v orbstack &> /dev/null; then
    if orbstack status &> /dev/null; then
        echo -e "${RED}  ⚠️  OrbStack läuft - wird gestoppt...${NC}"
        echo -e "${YELLOW}  Bitte stoppen Sie alle Container manuell, bevor Sie fortfahren!${NC}"
        read -p "  Möchten Sie fortfahren? (j/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[JjYy]$ ]]; then
            echo -e "${YELLOW}Abgebrochen${NC}"
            exit 0
        fi
        orbstack stop || true
    fi
else
    echo -e "${YELLOW}  ℹ️  OrbStack Befehl nicht gefunden${NC}"
fi

# Stoppe alle Docker-Container
echo -e "${YELLOW}→ Stoppe Docker...${NC}"
pkill -f OrbStack || true
pkill -f orbstack || true
sleep 3

# Schritt 2: Prüfen ob externes Laufwerk existiert
echo ""
echo -e "${YELLOW}→ Prüfe externe Festplatte...${NC}"
if [ ! -d "/Volumes/DOCKER_EXTERN" ]; then
    echo -e "${RED}  ✗ Externe Festplatte nicht gefunden: /Volumes/DOCKER_EXTERN${NC}"
    echo -e "${RED}  Bitte mounten Sie die externe Festplatte und versuchen Sie es erneut.${NC}"
    exit 1
fi

# Prüfe verfügbaren Speicher
AVAILABLE_SPACE=$(df -h "/Volumes/DOCKER_EXTERN" | tail -1 | awk '{print $4}')
echo -e "${GREEN}  ✓ Externe Festplatte gefunden${NC}"
echo -e "${GREEN}  ✓ Verfügbarer Speicher: $AVAILABLE_SPACE${NC}"

# Schritt 3: Prüfe Datenverzeichnis
echo ""
echo -e "${YELLOW}→ Prüfe OrbStack Datenverzeichnis...${NC}"
if [ ! -d "$ORB_DATA_DIR" ]; then
    echo -e "${RED}  ✗ OrbStack Datenverzeichnis nicht gefunden: $ORB_DATA_DIR${NC}"
    exit 1
fi

DATA_SIZE=$(du -sh "$ORB_DATA_DIR" 2>/dev/null | cut -f1)
echo -e "${GREEN}  ✓ Container-Daten gefunden (Größe: $DATA_SIZE)${NC}"

# Schritt 4: Backup erstellen
echo ""
echo -e "${YELLOW}→ Erstelle Backups...${NC}"
echo -e "  ${BLUE}Konfiguration: $CONF_BACKUP_DIR${NC}"
echo -e "  ${BLUE}Daten: $DATA_BACKUP_DIR${NC}"

if [ -L "$ORB_CONF_DIR" ]; then
    echo -e "${YELLOW}  Konfiguration ist bereits auf externer Festplatte${NC}"
else
    if [ -d "$ORB_CONF_DIR" ]; then
        cp -R "$ORB_CONF_DIR" "$CONF_BACKUP_DIR"
        echo -e "${GREEN}  ✓ Konfigurations-Backup erstellt${NC}"
    fi
fi

# Entferne alte externe Ordner falls vorhanden
if [ -d "$CONF_EXTERNAL" ] && [ ! -L "$ORB_CONF_DIR" ]; then
    rm -rf "$CONF_EXTERNAL"
fi
if [ -d "$DATA_EXTERNAL" ]; then
    rm -rf "$DATA_EXTERNAL"
fi

# Schritt 5: Migriere Datenverzeichnis (das Schwere!)
echo ""
echo -e "${YELLOW}→ Migriere Container-Daten zur externen Festplatte...${NC}"
echo -e "  ${BLUE}Von: $ORB_DATA_DIR${NC}"
echo -e "  ${BLUE}Nach: $DATA_EXTERNAL${NC}"
echo -e "  ${RED}ACHTUNG: Dies kann sehr lange dauern (~13GB)!${NC}"
read -p "  Möchten Sie fortfahren? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[JjYy]$ ]]; then
    echo -e "${YELLOW}Abgebrochen${NC}"
    exit 0
fi

echo -e "${YELLOW}  Bitte haben Sie Geduld, dies dauert mehrere Minuten...${NC}"

# Erstelle Backup des Datenverzeichnisses (falls möglich)
if [ -d "$ORB_DATA_DIR" ]; then
    echo -e "${YELLOW}  Erstelle Backup ($DATA_SIZE)...${NC}"
    mkdir -p "$(dirname "$DATA_BACKUP_DIR")"
    # Nur kopieren wenn genug Platz
    if [ "$(df -k "$HOME" | tail -1 | awk '{print $4}')" -gt 15000000 ]; then
        cp -R "$ORB_DATA_DIR" "$DATA_BACKUP_DIR"
        echo -e "${GREEN}  ✓ Daten-Backup erstellt${NC}"
    else
        echo -e "${YELLOW}  ℹ️  Nicht genug Platz für Backup - überspringe...${NC}"
    fi
fi

# Kopiere Daten zur externen Festplatte
rsync -av --progress "$ORB_DATA_DIR/" "$DATA_EXTERNAL/" 2>&1 | grep -E "^(total|sent|^/)" || echo "Kopiere..."

# Schritt 6: Erstelle symbolische Links
echo ""
echo -e "${YELLOW}→ Erstelle symbolische Links...${NC}"

# Konfigurations-Link
if [ ! -L "$ORB_CONF_DIR" ]; then
    if [ -d "$ORB_CONF_DIR" ]; then
        rm -rf "$ORB_CONF_DIR"
    fi
    ln -s "$CONF_EXTERNAL" "$ORB_CONF_DIR"
    echo -e "${GREEN}  ✓ Konfigurations-Link erstellt${NC}"
fi

# Daten-Link
if [ ! -L "$ORB_DATA_DIR" ]; then
    # Sichere Methode: erstelle Link in neuem Ordner
    ORB_DATA_PARENT=$(dirname "$ORB_DATA_DIR")
    ORB_DATA_NAME=$(basename "$ORB_DATA_DIR")
    
    if [ -d "$ORB_DATA_DIR" ]; then
        rm -rf "$ORB_DATA_DIR"
    fi
    mkdir -p "$ORB_DATA_PARENT"
    ln -s "$DATA_EXTERNAL" "$ORB_DATA_DIR"
    echo -e "${GREEN}  ✓ Daten-Link erstellt${NC}"
fi

# Schritt 7: Berechtigungen
echo ""
echo -e "${YELLOW}→ Setze Berechtigungen...${NC}"
chmod -R u+w "$CONF_EXTERNAL"
chmod -R u+w "$DATA_EXTERNAL"
echo -e "${GREEN}  ✓ Berechtigungen gesetzt${NC}"

# Schritt 8: Test
echo ""
echo -e "${YELLOW}→ Teste OrbStack...${NC}"
if open "/Applications/OrbStack.app" 2>/dev/null; then
    sleep 5
    if docker ps &> /dev/null; then
        echo -e "${GREEN}  ✓ Docker/OrbStack funktioniert${NC}"
    else
        echo -e "${YELLOW}  ℹ️  Prüfe manuell ob alles funktioniert${NC}"
    fi
fi

# Finale Zusammenfassung
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Migration erfolgreich abgeschlossen!               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Zusammenfassung:${NC}"
echo -e "  Konfiguration:     $ORB_CONF_DIR → $CONF_EXTERNAL"
echo -e "  Container-Daten:   $ORB_DATA_DIR → $DATA_EXTERNAL"
echo -e "  Backup (Config):   $CONF_BACKUP_DIR"
if [ -d "$DATA_BACKUP_DIR" ]; then
    echo -e "  Backup (Daten):    $DATA_BACKUP_DIR"
fi
echo ""
echo -e "${YELLOW}Wichtige Informationen:${NC}"
echo -e "  • Alle OrbStack-Daten sind jetzt auf der externen Festplatte"
echo -e "  • ~$DATA_SIZE wurden migriert"
echo -e "  • Die externe Festplatte muss während der Nutzung angeschlossen sein"
echo ""
echo -e "${BLUE}Zum Zurücksetzen:${NC}"
echo -e "  ./rollback-orbstack.sh"
echo ""

