# To-Do List – Video Analyse Dashboard  
**Projekt:** Video-Analyse Dashboard (Mac mini M4)  
**Stand:** Oktober 2025  
**Ziel:** Videos hochladen → speichern → Szenen erkennen → Szene-Vision Analyse → Dashboard-Ausgabe  
**Wichtig:** Jeder Schritt dokumentiert + getestet

---

## 1. Initiales Projekt-Setup  
- [ ] Monorepo erstellen (z. B. mit pnpm oder TurboRepo)  
  - [ ] Ordnerstruktur: `/frontend`, `/backend`, `/analyzer`, `/db`, `/docs`  
  - [ ] README im Root mit Projektüberblick  
- [ ] `docker-compose.yml` definieren (Services: frontend, backend, analyzer, postgres, nginx/traefik)  
  - [ ] ARM64 kompatible Images (Mac mini M4)  
  - [ ] Volumes: `storage/videos`, `db/data`  
- [ ] Linting/Formatierung/Hooks einrichten  
  - [ ] ESLint + Prettier Konfiguration  
  - [ ] Husky Git Hooks (z. B. pre-commit)  
  - [ ] CommitLint (konforme Commit-Nachrichten)  
- [ ] Umgebung dokumentieren  
  - [ ] `/docs/project-setup.md` → wie lokal starten auf Mac mini M4  
  - [ ] Hinweise zu ARM64 Builds, Docker auf macOS, ggf. Rosetta vermeiden  

---

## 2. Frontend (Svelte)  
- [ ] Neues Svelte Kit Projekt aufsetzen (empfohlene Version: Svelte v5)  
  - [ ] `package.json`, `tsconfig.json` (falls TypeScript)  
  - [ ] Vite oder entsprechende Build-Konfiguration  
- [ ] Upload-Komponente entwickeln  
  - [ ] Drag & Drop Bereich + Dateiauswahl  
  - [ ] Upload via REST API (`POST /api/videos`)  
  - [ ] Fortschrittsanzeige (Upload in Prozent)  
  - [ ] Fehler- und Erfolgsanzeige  
- [ ] Video-Galerie/Übersicht entwickeln  
  - [ ] Anzeige aller hochgeladenen Videos (Thumbnail, Titel, Dauer, Upload-Zeit)  
  - [ ] Link/Bereich zur Detailansicht eines Videos  
- [ ] Detailseite Analyseergebnisse  
  - [ ] Anzeige der Szenenliste (Startzeit, Endzeit, Keyframe)  
  - [ ] Möglichkeit, Szene anzuklicken und Preview/Keyframe anzusehen  
- [ ] Tests & Qualitätssicherung  
  - [ ] Unit Tests mit Vitest (oder ähnlicher)  
  - [ ] Integrationstest: Upload → Anzeige in Galerie  
  - [ ] Linting/Formatierung sicherstellen  
- [ ] Dokumentation  
  - [ ] `/frontend/README.md` mit Setup-Anleitung  
  - [ ] Styling/Design Guidelines (z. B. Farb-/Typografie-Schema)  

---

## 3. Backend (Node.js)  
- [ ] Node.js Projekt initialisieren (empfohlene Version: Node v24.x) :contentReference[oaicite:2]{index=2}  
  - [ ] `package.json`, Ordnerstruktur (`/src`, `/routes`, `/controllers`, `/models`)  
- [ ] API Endpoints definieren  
  - [ ] `POST /api/videos` → Upload Video (multipart/form-data)  
  - [ ] Middleware für Upload (z. B. multer)  
  - [ ] Speicherung der Datei, z. B. unter `storage/videos/{videoId}.mp4`  
  - [ ] `GET /api/videos` → Liste aller Videos mit Metadaten  
  - [ ] `GET /api/videos/{videoId}/scenes` → Szenenliste eines Videos  
- [ ] Datenbankanbindung  
  - [ ] PostgreSQL (empfohlene Version: v18 geplant)  
  - [ ] Verbindung über ORM oder Query-Builder (z. B. Prisma, TypeORM)  
  - [ ] Schema für Tabelle `videos` definieren (video_id, filename, duration, upload_time, status)  
- [ ] Analyse-Trigger implementieren  
  - [ ] Nach erfolgreichem Upload: Status auf „uploaded“, Trigger den Analyse-Service aufrufen (z. B. via Message Queue oder HTTP)  
- [ ] Tests  
  - [ ] Unit Tests mit Jest  
  - [ ] Integration Tests mit Supertest (z. B. Upload → DB Eintrag)  
- [ ] Dokumentation  
  - [ ] `/backend/README.md` mit Setup, API Endpoints, Architektur  

---

## 4. Analyse-Service  
- [ ] Projekt initialisieren (z. B. Python 3.12 oder Rust)  
- [ ] Szenenerkennung Modul entwickeln  
  - [ ] Nutzung von FFmpeg für Video-Decodierung / Keyframe Extraktion  
  - [ ] Nutzung von OpenCV (ARM64 optimiert) zur Szenenerkennung (Startzeit, Endzeit, Keyframe Pfad)  
- [ ] Daten-Persistenz  
  - [ ] Tabelle `scenes` definieren (scene_id, video_id, start_time, end_time, keyframe_path)  
  - [ ] Nach Analyse: Video Status auf „analyzed“ setzen  
- [ ] Logging & Fehlerbehandlung  
  - [ ] Analyse-Logs speichern (`analysis_logs` Tabelle)  
- [ ] Tests  
  - [ ] Unit Tests (z. B. pytest)  
  - [ ] Integration Test mit Sample-Video → Szenenerkennung → DB Eintrag  
- [ ] Dokumentation  
  - [ ] `/analyzer/README.md` mit Workflow, Technologien, wie man lokal startet  

---

## 5. Datenbank & Migration  
- [ ] Schema Definition schreiben  
  - [ ] `videos`, `scenes`, `analysis_logs` Tabellen  
- [ ] Migrationsskripte erstellen (z. B. Flyway, Liquibase oder Prisma Migrate)  
- [ ] Indizes für häufig abgefragte Felder (z. B. video_id in `scenes`)  
- [ ] Dokumentation  
  - [ ] `/db/DB_SCHEMA.md` mit Erläuterung der Tabellen, Beziehungen, Felder  

---

## 6. Dokumentation & Tests / CI  
- [ ] Dokumentation schreiben:  
  - [ ] `/docs/project-setup.md`  
  - [ ] API Dokumentation (OpenAPI/Swagger) im Backend  
  - [ ] Entwickler-Guide für Mac mini M4 (ARM64 Besonderheiten)  
- [ ] Testing Strategie definieren  
  - [ ] Coverage Ziel setzen (z. B. 80 %)  
  - [ ] CI Pipeline (z. B. GitHub Actions) – beim Push + PR läuft: Lint → Tests → Build  
- [ ] Monitoring/Logging Überlegungen  
  - [ ] Logging im Backend/Analyzer (z. B. Winston oder vergleichbar)  
  - [ ] Optional: Metrics (z. B. Prometheus/Grafana)  
- [ ] Regelmäßige Reviews der Dependencies (Auf aktuelle Versionen prüfen)  
- [ ] Backup/Recovery Strategie für Videos & DB  

---

## 7. Deployment & Umgebung  
- [ ] Lokales Deployment mit Docker Compose testen  
  - [ ] `docker-compose up --build` funktioniert fehlerfrei auf Mac mini M4  
  - [ ] Frontend, Backend, Analyzer, DB, Reverse-Proxy laufen sauber  
- [ ] Umgebungsvariablen & Secrets konfigurieren  
  - [ ] `.env.example` bereitstellen  
- [ ] Produktions-Überlegungen (später)  
  - [ ] Speicher- und I/O-Optimierung für Video-Uploads  
  - [ ] Skalierbarkeit – wie analysieren wir viele Videos parallel  
  - [ ] Fehler- und Alarm-Handling  

---

## 8. Erweiterung & Vision  
- [ ] Vision-Analyse pro Szene:  
  - [ ] CLIP oder Vision Model Integration vorbereiten  
  - [ ] API/Service Interface dafür definieren  
- [ ] UI/UX Erweiterungen:  
  - [ ] Highlighting wichtiger Szenen  
  - [ ] Export-Funktion (z. B. CSV/JSON der Szenen)  
- [ ] Performance-Tuning für Mac mini M4:  
  - [ ] Native ARM64 Builds sicherstellen  
  - [ ] Nutzung von Apple Metal oder Hardware-Beschleunigung falls möglich  
- [ ] Qualitätssicherung & Review:  
  - [ ] Code-Review Routinen etablieren  
  - [ ] Sicherheits-Audit (z. B. Upload-Sanitisation)  

---

## ✅ Abschlusskriterien  
- Jeder Task „[ ]“ muss dokumentiert sein (README oder entsprechende Modul-Doc)  
- Jeder Task muss zumindest eine Minimal-Test-Coverage haben  
- Lokaler Workflow auf Mac mini M4 etabliert: Entwickler kann mit einem Befehl das System starten  
- Grundfunktion: Upload eines Videos → Speicherung → Szenenerkennung → Anzeige der Szenen im Dashboard funktioniert  
- Code sauber, strukturiert, mit Linting/Formatierung/Hooks  

---

*Diese To-Do-Liste kann im Verlauf erweitert oder angepasst werden, wenn neue Anforderungen auftreten.*  
