# Alternative: CEP Extension statt UXP

## Problem

UXP wird vom UXP Developer Tool nicht erkannt mit der Fehlermeldung:
```
Plugin manifest has an incorrect host.app specified : AEFT or plugin actions are not supported for this App
```

## Warum CEP besser sein könnte

CEP (Common Extensibility Platform) ist:
- ✅ Bewährt und stabil
- ✅ Gute Dokumentation
- ✅ Viele Beispiele verfügbar
- ✅ Kompatibel mit After Effects (auch älteren Versionen)
- ✅ Einfacheres Setup
- ⚠️ Aber: Adobe entwickelt UXP als Nachfolger

## Alternative Lösung: Script-only Approach

Statt eines Panels könnten wir ein **Script** erstellen, das:

1. **Manuell ausgeführt wird**:
   - User öffnet Script-Panel in AE
   - Trägt Suchbegriff ein
   - Script lädt Ergebnisse
   - Script fügt Szenen hinzu

2. **Oder als ExtendScript**:
   - GUI via Dialog oder Adobe ScriptUI
   - Bessere Integration in AE

## Empfehlung

**Für schnellen Erfolg**: Nutze die bestehende **Search-Funktion im Browser-Frontend** und übertrage die Ergebnisse manuell in AE.

Oder:
- Backend API ist fertig ✅
- Frontend Search ist fertig ✅  
- Nutze die bestehende Web-Oberfläche für die Suche
- Kopiere dann die gefundenen Szenen/Timecodes manuell in After Effects

## Nächste Schritte

Option 1: Frontend nutzen (bereits vorhanden ✅)
```
1. Web-Interface öffnen
2. Nach Szenen suchen
3. Timecodes notieren
4. Manuell in AE importieren
```

Option 2: ExtendScript erstellen (neue Implementierung)
```
1. Script mit GUI erstellen
2. API-Suche einbauen
3. Automatisches Importieren
```

Welche Option bevorzugst du?

