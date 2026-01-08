# Einfache Installation - CEP Extension

## Schnellste Installation

```bash
# Extension installieren
cp -r /Volumes/DOCKER_EXTERN/prismvid/tools/ae-cep-extension \
     ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
```

**Fertig!** ✅

## Nach Installation

1. **After Effects öffnen**
2. **Preferences**: General > "Allow Scripts to Write Files and Access Network" aktivieren
3. **Panel öffnen**: Window > Extensions > PrismVid Scene Search

## Verifizierung

Prüfen ob Extension installiert ist:

```bash
ls ~/Library/Application\ Support/Adobe/CEP/extensions/PrismVidSceneSearch
```

Sollte zeigen:
- .debug
- CSXS/
- client/
- host/

## Proxy & Backend

**Proxy läuft bereits** ✅ (siehe Terminal)

**Backend läuft** ✅ (Docker)

Nichts weiter nötig!

## Erste Verwendung

1. Panel öffnen
2. Settings > "Test Connection" (optional)
3. Search-Query eingeben
4. "Search" klicken
5. Szenen auswählen
6. "Add Scenes" klicken

Viel Erfolg! 🎉

