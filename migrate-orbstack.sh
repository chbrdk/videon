#!/bin/bash

# OrbStack Migration Script - Verschiebt OrbStack auf externe Festplatte
# Erstellt automatisch ein Backup des alten Ordners

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Pfade
ORIGINAL_DIR="$HOME/.orbstack"
BACKUP_DIR="$HOME/.orbstack.backup.$(date +%Y%m%d_%H%M%S)"
EXTERNAL_DIR="/Volumes/DOCKER_EXTERN/orbstack"

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  OrbStack Migration auf externe Festplatte       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Schritt 1: Prüfen ob OrbStack läuft
echo -e "${YELLOW}→ Prüfe ob OrbStack läuft...${NC}"
if command -v orbstack &> /dev/null; then
    if orbstack status &> /dev/null; then
        echo -e "${YELLOW}  OrbStack läuft - wird gestoppt...${NC}"
        orbstack stop || true
        sleep 2
    else
        echo -e "${GREEN}  ✓ OrbStack läuft nicht${NC}"
    fi
else
    echo -e "${YELLOW}  ℹ️  OrbStack Befehl nicht gefunden - prüfe Prozesse...${NC}"
    # Versuche OrbStack-Prozesse zu beenden
    pkill -f OrbStack || true
    pkill -f orbstack || true
    sleep 2
fi

# Schritt 2: Prüfen ob externes Laufwerk existiert
echo ""
echo -e "${YELLOW}→ Prüfe externe Festplatte...${NC}"
if [ ! -d "/Volumes/DOCKER_EXTERN" ]; then
    echo -e "${RED}  ✗ Externe Festplatte nicht gefunden: /Volumes/DOCKER_EXTERN${NC}"
    echo -e "${RED}  Bitte mounten Sie die externe Festplatte und versuchen Sie es erneut.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Externe Festplatte gefunden${NC}"

# Prüfe verfügbaren Speicher
AVAILABLE_SPACE=$(df -h "/Volumes/DOCKER_EXTERN" | tail -1 | awk '{print $4}')
echo -e "${GREEN}  ✓ Verfügbarer Speicher: $AVAILABLE_SPACE${NC}"

# Schritt 3: Prüfen ob OrbitStack-Ordner existiert
echo ""
echo -e "${YELLOW}→ Prüfe OrbStack Datenverzeichnis...${NC}"
if [ ! -d "$ORIGINAL_DIR" ]; then
    echo -e "${RED}  ✗ OrbStack Datenverzeichnis nicht gefunden: $ORIGINAL_DIR${NC}"
    echo -e "${RED}  Ist OrbStack installiert?${NC}"
    exit 1
fi

# Prüfe Größe des Ordners
ORIGINAL_SIZE=$(du -sh "$ORIGINAL_DIR" 2>/dev/null | cut -f1 || echo "0")
echo -e "${GREEN}  ✓ OrbStack Daten gefunden (Größe: $ORIGINAL_SIZE)${NC}"

# Schritt 4: Backup erstellen
echo ""
echo -e "${YELLOW}→ Erstelle Backup des ursprünglichen Ordners...${NC}"
echo -e "  ${BLUE}Von: $ORIGINAL_DIR${NC}"
echo -e "  ${BLUE}Nach: $BACKUP_DIR${NC}"

if [ -d "$ORIGINAL_DIR" ]; then
    cp -R "$ORIGINAL_DIR" "$BACKUP_DIR"
    echo -e "${GREEN}  ✓ Backup erstellt${NC}"
else
    echo -e "${RED}  ✗ Konnte Backup nicht erstellen${NC}"
    exit 1
fi

# Schritt 5: Prüfen ob Link bereits existiert
echo ""
echo -e "${YELLOW}→ Prüfe auf bestehenden Link...${NC}"
if [ -L "$ORIGINAL_DIR" ]; then
    echo -e "${YELLOW}  Symbolischer Link existiert bereits${NC}"
    read -p "  Möchten Sie fortfahren? (j/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[JjYy]$ ]]; then
        echo -e "${YELLOW}Abgebrochen${NC}"
        exit 0
    fi
    # Entferne alten Link
    rm "$ORIGINAL_DIR"
fi

# Schritt 6: Daten zur externen Festplatte kopieren
echo ""
echo -e "${YELLOW}→ Kopiere OrbStack Daten zur externen Festplatte...${NC}"
echo -e "  ${BLUE}Von: $ORIGINAL_DIR${NC}"
echo -e "  ${BLUE}Nach: $EXTERNAL_DIR${NC}"
echo -e "  ${YELLOW}Bitte haben Sie Geduld, dies kann einige Minuten dauern...${NC}"

# Entferne existierenden Ordner auf externer Festplatte falls vorhanden
if [ -d "$EXTERNAL_DIR" ]; then
    echo -e "${YELLOW}  Existierender Ordner wird gelöscht...${NC}"
    rm -rf "$EXTERNAL_DIR"
fi

# Kopiere Daten
cp -R "$ORIGINAL_DIR" "$EXTERNAL_DIR"

# Verifiziere die Kopie
if [ -d "$EXTERNAL_DIR" ]; then
    EXTERNAL_SIZE=$(du -sh "$EXTERNAL_DIR" 2>/dev/null | cut -f1)
    echo -e "${GREEN}  ✓ Daten kopiert (Größe: $EXTERNAL_SIZE)${NC}"
else
    echo -e "${RED}  ✗ Kopieren fehlgeschlagen${NC}"
    exit 1
fi

# Schritt 7: Lösche ursprünglichen Ordner (optional)
echo ""
read -p "Möchten Sie den ursprünglichen Ordner löschen? (Backup bleibt erhalten) (j/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[JjYy]$ ]]; then
    echo -e "${YELLOW}→ Lösche ursprünglichen Ordner...${NC}"
    rm -rf "$ORIGINAL_DIR"
    echo -e "${GREEN}  ✓ Ordner gelöscht${NC}"
else
    echo -e "${YELLOW}→ Ursprünglicher Ordner bleibt erhalten als Backup${NC}"
fi

# Schritt 8: Erstelle symbolischen Link
echo ""
echo -e "${YELLOW}→ Erstelle symbolischen Link...${NC}"
ln -s "$EXTERNAL_DIR" "$ORIGINAL_DIR"

if [ -L "$ORIGINAL_DIR" ]; then
    echo -e "${GREEN}  ✓ Symbolischer Link erstellt${NC}"
    echo -e "  ${BLUE}$ORIGINAL_DIR → $EXTERNAL_DIR${NC}"
else
    echo -e "${RED}  ✗ Konnte Link nicht erstellen${NC}"
    exit 1
fi

# Schritt 9: Berechtigungen prüfen
echo ""
echo -e "${YELLOW}→ Setze Berechtigungen...${NC}"
chmod -R u+w "$EXTERNAL_DIR"
echo -e "${GREEN}  ✓ Berechtigungen gesetzt${NC}"

# Schritt 10: Test - versuche OrbStack zu starten
echo ""
echo -e "${YELLOW}→ Teste OrbStack...${NC}"
if orbstack start; then
    sleep 3
    if orbstack status &> /dev/null; then
        echo -e "${GREEN}  ✓ OrbStack läuft erfolgreich${NC}"
    else
        echo -e "${YELLOW}  ℹ️  OrbStack startet - prüfe Status manuell${NC}"
    fi
else
    echo -e "${YELLOW}  ℹ️  OrbStack muss manuell gestartet werden${NC}"
fi

# Finale Zusammenfassung
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Migration erfolgreich abgeschlossen!           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Zusammenfassung:${NC}"
echo -e "  Original:     $ORIGINAL_DIR"
echo -e "  Neuer Ort:    $EXTERNAL_DIR"
echo -e "  Backup:       $BACKUP_DIR"
echo ""
echo -e "${YELLOW}Wichtige Informationen:${NC}"
echo -e "  • Alle OrbStack-Daten sind jetzt auf der externen Festplatte"
echo -e "  • Das Backup bleibt erhalten für 30 Tage"
echo -e "  • Die externe Festplatte muss während der Nutzung angeschlossen sein"
echo -e "  • Bei Problemen: Sie haben das Backup bei: $BACKUP_DIR"
echo ""
echo -e "${BLUE}Zum Entfernen des Backups (nach 30 Tagen):${NC}"
echo -e "  rm -rf $BACKUP_DIR"
echo ""

