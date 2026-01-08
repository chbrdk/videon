# Connection Fix - Shell Commands

## Problem

ExtendScript hat keine native HTTP-Request-Funktionalität. Die bisherigen Versuche mit XMLHttpRequest funktionieren nicht.

## Lösung

Script nutzt jetzt `app.system()` für shell commands:

```javascript
// Use curl via system() command for ExtendScript
var curlCommand = 'curl -s "' + url + '"';
var tempFile = new File(Folder.temp + "/prismvid_response.json");
var shellResult = app.system(curlCommand, tempFile);
```

## Voraussetzungen

### 1. Preferences aktivieren

**WICHTIG**: In After Effects:
```
Preferences > General > Allow Scripts to Write Files and Access Network
```
**MUSS aktiviert sein!**

### 2. curl installiert

Auf macOS ist curl standardmäßig installiert. Windows-Nutzer sollten Git Bash oder eine curl-Installation haben.

## Test

Script erneut ausführen:

1. **After Effects öffnen**
2. **Preferences > General > Allow Scripts...** aktivieren
3. **File > Scripts > Run Script File...**
4. **PrismVidSceneSearch.jsx** wählen
5. **"Test Connection"** klicken

Jetzt sollte es funktionieren!

## Alternative (Falls nicht funktioniert)

Falls `app.system()` auch nicht funktioniert, bleibt nur die manuelle Nutzung des Frontends als Workaround.

## Status

✅ Shell-Command-Implementierung hinzugefügt  
⚠️ Erfordert Preferences-Aktivierung  
⚠️ Benötigt curl-Installation  

