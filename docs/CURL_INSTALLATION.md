# curl Installation für After Effects ExtendScript

## macOS

curl ist standardmäßig installiert. Prüfen mit:

```bash
which curl
# Sollte zeigen: /usr/bin/curl
```

Falls nicht vorhanden:
```bash
# Homebrew installieren und curl nachinstallieren
brew install curl
```

## Windows

### Option 1: Git Bash (Empfohlen)

Wenn Git für Windows installiert ist, ist curl in Git Bash enthalten:

```bash
# In Git Bash
curl --version
```

### Option 2: Windows-curl installieren

1. Download: https://curl.se/windows/
2. In PATH aufnehmen

### Option 3: cygwin

curl mit cygwin installieren.

## Test

Nach Installation:

```bash
curl --version
# Sollte Version anzeigen
```

## Alternative: Script ohne curl

Falls curl weiterhin Probleme macht, können wir eine Alternative implementieren, die ohne curl auskommt.

## Status

Auf macOS sollte curl bereits verfügbar sein.
Falls nicht: `brew install curl`

