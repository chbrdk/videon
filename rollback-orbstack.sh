#!/bin/bash

# OrbStack Rollback Script - Stellt den ursprünglichen Zustand wieder her

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Pfade
ORIGINAL_DIR="$HOME/.orbstack"
BACKUP_PATTERN="$HOME/.orbstack.backup.*"

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  OrbStack Rollback - Wiederherstellung           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Schritt 1: OrbStack stoppen
echo -e "${YELLOW}→ Stoppe OrbStack...${NC}"
if command -v orbstack &> /dev/null; then
    orbstack stop || true
    pkill -f OrbStack || true
    pkill -f orbstack || true
    sleep 2
fi
echo -e "${GREEN}  ✓ OrbStack gestoppt${NC}"

# Schritt 2: Suche Backup-Ordner
echo ""
echo -e "${YELLOW}→ Suche Backup-Ordner...${NC}"
LATEST_BACKUP=$(ls -td $BACKUP_PATTERN 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}  ✗ Kein Backup-Ordner gefunden${NC}"
    echo -e "${RED}  Verfügbare Backups:${NC}"
    ls -ld $BACKUP_PATTERN 2>/dev/null || echo "  Keine Backups vorhanden"
    exit 1
fi

echo -e "${GREEN}  ✓ Backup gefunden: $LATEST_BACKUP${NC}"

# Bestätigung
echo ""
echo -e "${RED}⚠️  WARNUNG: Dieser Vorgang wird die Migration rückgängig machen!${NC}"
read -p "Möchten Sie fortfahren? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[JjYy]$ ]]; then
    echo -e "${YELLOW}Abgebrochen${NC}"
    exit 0
fi

# Schritt 3: Entferne symbolischen Link
echo ""
echo -e "${YELLOW}→ Entferne symbolischen Link...${NC}"
if [ -L "$ORIGINAL_DIR" ]; then
    rm "$ORIGINAL_DIR"
    echo -e "${GREEN}  ✓ Symbolischer Link entfernt${NC}"
elif [ -d "$ORIGINAL_DIR" ]; then
    echo -e "${YELLOW}  Ursprünglicher Ordner existiert (kein Link-Tröpfel)${NC}"
else
    echo -e "${GREEN}  ✓ Kein Link zu entfernen${NC}"
fi

# Schritt 4: Wiederherstelle aus Backup
echo ""
echo -e "${YELLOW}→ Stelle OrbStack aus Backup wieder her...${NC}"
cp -R "$LATEST_BACKUP" "$ORIGINAL_DIR"
echo -e "${GREEN}  ✓ Wiederherstellung abgeschlossen${NC}"

# Schritt 5: Cleanup - Lösche externe Kopie (optional)
echo ""
read -p "Möchten Sie auch die externe Kopie löschen? (j/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[JjYy]$ ]]; then
    echo -e "${YELLOW}→ Lösche externe Kopie...${NC}"
    rm -rf "/Volumes/DOCKER_EXTERN/orbstack"
    echo -e "${GREEN}  ✓ Externe Kopie gelöscht${NC}"
fi

# Schritt 6: Starte OrbStack
echo ""
echo -e "${YELLOW}→ Starte OrbStack...${NC}"
if orbstack start; then
    echo -e "${GREEN}  ✓ OrbStack gestartet${NC}"
else
    echo -e "${YELLOW}  ℹ️  OrbStack wurde wiederhergestellt, starten Sie es manuell${NC}"
fi

# Finale Zusammenfassung
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Rollback erfolgreich abgeschlossen!             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}OrbStack wurde auf den ursprünglichen Zustand zurückgesetzt.${NC}"
echo -e "${BLUE}Verwendetes Backup: $LATEST_BACKUP${NC}"
echo ""

