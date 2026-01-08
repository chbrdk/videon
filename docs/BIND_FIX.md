# .bind() Fix für ExtendScript

## Problem

ExtendScript unterstützt keine `.bind()` Methode. Fehlermeldung:
```
Error: ReferenceError: Funktion 'function(){}.bind' wurde nicht definiert
```

## Lösung

Alle `.bind(this)` Aufrufe wurden durch lokale Variablen ersetzt:

**Vorher:**
```javascript
testBtn.onClick = function() {
    this.testConnection(urlField.text);
}.bind(this);  // ❌ Nicht unterstützt
```

**Nachher:**
```javascript
var appInstance = this;
testBtn.onClick = function() {
    appInstance.testConnection(urlField.text);
};  // ✅ Funktioniert
```

## Änderungen

1. **Zeile 54**: `var appInstance = this;` hinzugefügt
2. **Zeile 57**: `this.testConnection()` → `appInstance.testConnection()`
3. **Zeile 80**: `this.performSearch()` → `appInstance.performSearch()`
4. **Zeile 148**: `this.insertSelectedScenes()` → `appInstance.insertSelectedScenes()`

## Testen

Script erneut ausführen:
1. After Effects öffnen
2. File > Scripts > Run Script File...
3. PrismVidSceneSearch.jsx wählen
4. GUI sollte jetzt erscheinen

## Status

✅ Alle `.bind()` Aufrufe entfernt  
✅ Script sollte jetzt in After Effects funktionieren

