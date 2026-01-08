# After Effects Script Verwendung

## Problem

Das ExtendScript hat Einschränkungen mit HTTP-Requests im Netzwerk.

## Lösungen

### Option 1: ScriptUI-Shell-Command (EMPFOHLEN)

Nutze Shell-Commands für HTTP-Requests:

```javascript
// In ExtendScript
var curl = 'curl -s "' + url + '"';
var result = app.system(curl);
```

### Option 2: Intermediate File-basiert

1. Script erstellt eine JSON-Datei mit der Suchanfrage
2. Separate Node.js/Python-Script macht HTTP-Request
3. Script liest Ergebnis-JSON
4. Verarbeitung

### Option 3: Lokales Backend-Proxy

Ein simples lokales Proxy-Script, das:
- HTTP-Server auf localhost:3000
- Reicht Requests an Backend weiter
- Script macht file://-Requests zu localhost

### Option 4: Direkt nutzen über Frontend

**Die einfachste Lösung**: Nutze das bereits funktionierende **Frontend**!

1. Browser öffnen
2. Navigieren zu PrismVid Frontend
3. Nach Szenen suchen
4. Timecodes notieren
5. Manuell in After Effects importieren

## Empfehlung

**Für sofortige Verwendung**: Frontend nutzen  
**Für Automatisierung**: Option 1 oder 2 implementieren

Soll ich eine der Lösungen implementieren?

