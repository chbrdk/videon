# PrismVid API Dokumentation

## Übersicht

PrismVid ist eine Video-Editing-Plattform mit folgenden Hauptfunktionen:
- Video-Upload und -Verwaltung
- Automatische Szenen-Erkennung und -Analyse
- Projekt-basierte Video-Bearbeitung
- Audio-Separation und -Stem-Management
- Suchfunktionalität
- Export-Funktionen (Premiere Pro, FCP, SRT)

## Base URL
```
http://localhost:4001/api
```

---

## 📁 Videos API (`/videos`)

### Video Management

#### `POST /videos`
**Upload eines neuen Videos**
- **Body**: `multipart/form-data` mit `video` File
- **Response**: Video-Objekt mit Metadaten
- **Limit**: 100MB Dateigröße

#### `GET /videos`
**Alle Videos abrufen**
- **Response**: Array von Video-Objekten

#### `GET /videos/:id`
**Video nach ID abrufen**
- **Response**: Video-Objekt mit Metadaten

#### `DELETE /videos/:id`
**Video löschen**
- **Response**: Success-Message

#### `PUT /videos/:id/move`
**Video in Ordner verschieben**
- **Body**: `{ folderId: string }`

### Video Streaming & Files

#### `GET /videos/:id/file`
**Video-Datei streamen**
- **Response**: Video-Stream mit Range-Support

#### `GET /videos/:id/thumbnail`
**Video-Thumbnail abrufen**
- **Query**: `?t=timestamp` (optional)
- **Response**: Bild-Stream

### Scene Management

#### `GET /videos/:id/scenes`
**Alle Szenen eines Videos abrufen**
- **Response**: Array von Scene-Objekten

#### `GET /videos/:id/scenes/:sceneId/thumbnail`
**Scene-Thumbnail abrufen**
- **Response**: Bild-Stream

#### `PUT /videos/:id/scenes/reorder`
**Szenen-Reihenfolge ändern**
- **Body**: `{ scenes: [{ sceneId: string, order: number }] }`

#### `POST /videos/:id/scenes/:sceneId/split`
**Szene an bestimmter Zeit teilen**
- **Body**: `{ splitTime: number }`
- **Response**: `{ scene1: Scene, scene2: Scene }`

#### `DELETE /videos/:id/scenes/:sceneId`
**Szene löschen**

#### `POST /videos/:id/scenes/merge`
**Szenen zusammenführen**
- **Body**: `{ sceneIds: string[] }`

### Scene Video Generation

#### `GET /videos/:id/scene-video`
**Scene-Video generieren und streamen**
- **Query**: `?startTime=number&endTime=number`
- **Response**: Video-Stream

#### `DELETE /videos/:id/scene-video`
**Scene-Video löschen**
- **Query**: `?startTime=number&endTime=number`

### Analysis & Vision

#### `GET /videos/:id/vision`
**Vision-Analyse-Daten abrufen**
- **Response**: Array von Vision-Objekten mit Objekten, Gesichtern, Qwen VL Beschreibungen, etc.

#### `POST /videos/:id/vision/analyze`
**Vision-Analyse starten**
- **Body**: `{ timeInterval?: number }`

#### `POST /videos/:id/qwenVL/analyze`
**Qwen VL semantische Analyse starten**
- **Response**: `{ message: string, videoId: string, status: 'ANALYZING' }`
- **Fehler**: 
  - `503 Service Unavailable`: Qwen VL Service nicht erreichbar
  - `500 Internal Server Error`: Fehler beim Starten

#### `GET /videos/:id/qwenVL/status`
**Qwen VL Analyse-Fortschritt abrufen**
- **Response**: 
  ```json
  {
    "videoId": "string",
    "status": "ANALYZING" | "COMPLETED",
    "totalScenes": 77,
    "analyzedScenes": 33,
    "progress": 43,
    "isComplete": false
  }
  ```

### Transcription

#### `POST /videos/:id/transcribe`
**Transkription starten**

#### `GET /videos/:id/transcription`
**Transkription abrufen**
- **Response**: Array von Transcription-Segmenten

### Timeline Management

#### `GET /videos/:id/timeline`
**Timeline-Daten abrufen**

#### `PUT /videos/:id/timeline/reorder`
**Timeline-Reihenfolge ändern**

#### `POST /videos/:id/timeline/scenes/:sceneId/split`
**Timeline-Szene teilen**

#### `DELETE /videos/:id/timeline/scenes/:sceneId`
**Timeline-Szene löschen**

#### `POST /videos/:id/timeline/scenes/merge`
**Timeline-Szenen zusammenführen**

### Export Functions

#### `GET /videos/:id/export/premiere`
**Premiere Pro Export**
- **Response**: ZIP-Datei mit Projekt-Dateien

#### `GET /videos/:id/export/premiere/xml`
**Premiere Pro XML Export**
- **Response**: XML-Datei

#### `GET /videos/:id/export/fcpxml`
**Final Cut Pro XML Export**
- **Response**: FCPXML-Datei

#### `GET /videos/:id/export/srt`
**SRT-Untertitel Export**
- **Response**: SRT-Datei

#### `GET /videos/:id/timeline/export/:format`
**Timeline-Export in verschiedenen Formaten**
- **Formats**: `premiere`, `fcpxml`, `srt`

---

## 📂 Projects API (`/projects`)

### Project Management

#### `POST /projects`
**Neues Projekt erstellen**
- **Body**: `{ name: string, description?: string }`
- **Response**: Project-Objekt

#### `GET /projects`
**Alle Projekte abrufen**
- **Response**: Array von Project-Objekten

#### `GET /projects/:id`
**Projekt nach ID abrufen**
- **Response**: Project-Objekt mit Szenen

#### `DELETE /projects/:id`
**Projekt löschen**

### Scene Management

#### `POST /projects/:id/scenes`
**Szene zu Projekt hinzufügen**
- **Body**: `{ videoId: string, startTime: number, endTime: number }`
- **Response**: ProjectScene-Objekt

#### `PUT /projects/:id/scenes/reorder`
**Projekt-Szenen neu anordnen**
- **Body**: `{ scenes: [{ sceneId: string, order: number }] }`

#### `PUT /projects/scenes/:sceneId/timing`
**Scene-Timing aktualisieren**
- **Body**: `{ startTime?: number, endTime?: number, trimStart?: number, trimEnd?: number }`

#### `DELETE /projects/scenes/:sceneId`
**Scene aus Projekt entfernen**

#### `DELETE /projects/:id/scenes/:sceneId`
**Scene aus Projekt entfernen (Alternative Route)**

### Editing Functions

#### `POST /projects/scenes/:sceneId/split`
**Scene teilen**
- **Body**: `{ splitTime: number }`
- **Response**: `{ scene1: ProjectScene, scene2: ProjectScene }`

#### `PUT /projects/scenes/:sceneId/audio-level`
**Scene-Audio-Level ändern**
- **Body**: `{ audioLevel: number }`

### History & Undo/Redo

#### `GET /projects/:id/history`
**Projekt-History abrufen**
- **Response**: Array von History-Einträgen

#### `POST /projects/:id/undo`
**Letzte Aktion rückgängig machen**

#### `POST /projects/:id/redo`
**Rückgängig gemachte Aktion wiederholen**

### Transcription

#### `GET /projects/:id/transcription-segments`
**Projekt-Transkription abrufen**
- **Response**: Array von Transcription-Segmenten

---

## 🔍 Search API (`/search`)

#### `GET /search`
**Videos und Szenen durchsuchen**
- **Query**: `?q=searchTerm&type=all|videos|scenes`
- **Response**: Array von SearchResult-Objekten

#### `POST /search/videos/:videoId/index`
**Video für Suche indexieren**

---

## 📁 Folders API (`/folders`)

### Folder Management

#### `GET /folders`
**Alle Ordner abrufen**
- **Query**: `?parentId=string` (optional)
- **Response**: Array von Folder-Objekten

#### `GET /folders/:id`
**Ordner nach ID abrufen**
- **Special**: `id=root` für Root-Level

#### `GET /folders/:id/breadcrumbs`
**Breadcrumbs für Ordner abrufen**
- **Response**: Array von Breadcrumb-Objekten

#### `POST /folders`
**Neuen Ordner erstellen**
- **Body**: `{ name: string, parentId?: string }`

#### `PUT /folders/:id`
**Ordner umbenennen**
- **Body**: `{ name: string }`

#### `DELETE /folders/:id`
**Ordner löschen**

#### `POST /folders/:id/move-videos`
**Videos in Ordner verschieben**
- **Body**: `{ videoIds: string[] }`

---

## 🎵 Audio Stems API (`/audio-stems`)

### Audio Stem Management

#### `GET /audio-stems/videos/:videoId/audio-stems`
**Audio-Stems für Video abrufen**
- **Response**: Array von AudioStem-Objekten

#### `GET /audio-stems/audio-stems/:id/stream`
**Audio-Stem streamen**
- **Response**: Audio-Stream

#### `POST /audio-stems/videos/:videoId/separate-audio`
**Audio-Separation starten**

#### `POST /audio-stems/audio-stems`
**Audio-Stem erstellen (für Analyzer Service)**
- **Body**: AudioStem-Daten

#### `DELETE /audio-stems/audio-stems/:id`
**Audio-Stem löschen**

---

## 🏥 Health API (`/health`)

#### `GET /health`
**System-Health-Status abrufen**
- **Response**: Health-Objekt mit Service-Status
- **Services**: backend, database, analyzer

---

## 🧪 Test APIs

### Test Routes (`/test`)

#### `POST /test/upload`
**Test-Video-Upload**
- **Body**: `multipart/form-data` mit `video` File

#### `GET /test/videos`
**Alle Test-Videos abrufen**

#### `GET /test/videos/:id`
**Test-Video nach ID abrufen**

#### `GET /test/videos/:id/scenes`
**Test-Video-Szenen abrufen**

#### `GET /test/videos/:id/vision`
**Test-Video-Vision-Analyse**

#### `GET /test/videos/:id/stream`
**Test-Video streamen**

#### `POST /test/demo-video`
**Demo-Video erstellen**

### Test Upload Routes (`/test-upload`)

#### `POST /test-upload`
**Test-Upload mit Datenbank-Speicherung**
- **Body**: `multipart/form-data` mit `video` File

#### `GET /test-upload/:id/file`
**Test-Video-Datei abrufen**

---

## 📊 Datenmodelle

### Video
```typescript
interface Video {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  status: 'UPLOADED' | 'ANALYZING' | 'ANALYZED' | 'ERROR';
  uploadedAt: string;
  analyzedAt?: string;
  folderId?: string;
  scenes?: Scene[];
}
```

### Scene
```typescript
interface Scene {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  keyframePath?: string;
  visionData?: any;
  createdAt: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  scenes: ProjectScene[];
}
```

### ProjectScene
```typescript
interface ProjectScene {
  id: string;
  projectId: string;
  videoId: string;
  startTime: number;
  endTime: number;
  order: number;
  audioLevel: number;
  createdAt: string;
}
```

### AudioStem
```typescript
interface AudioStem {
  id: string;
  videoId: string;
  type: 'vocals' | 'music' | 'other';
  filePath: string;
  createdAt: string;
}
```

### Folder
```typescript
interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  videos?: Video[];
}
```

### SearchResult
```typescript
interface SearchResult {
  type: 'video' | 'scene';
  id: string;
  videoId: string;
  videoTitle: string;
  content: string;
  startTime?: number;
  endTime?: number;
  relevanceScore: number;
}
```

---

## 🔧 Error Handling

Alle APIs verwenden standardisierte HTTP-Status-Codes:

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **404**: Not Found
- **500**: Internal Server Error

Error-Response-Format:
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

---

## 🔐 Authentication

Aktuell keine Authentication implementiert. Alle APIs sind öffentlich zugänglich.

---

## 📝 Notes

- **File Upload Limit**: 100MB pro Video
- **Video Formats**: MP4, AVI, MOV, etc. (alle von FFmpeg unterstützten Formate)
- **Audio Separation**: Verwendet AI-basierte Trennung (vocals/music)
- **Vision Analysis**: Swift-basierter Vision Service auf Port 8080
- **Analyzer Service**: Python-basierter Service für Video-Analyse
- **Database**: Prisma mit SQLite (Development) / PostgreSQL (Production)

---

## 🚀 Getting Started

1. **Backend starten**: `cd packages/backend && npm run dev`
2. **Frontend starten**: `cd packages/frontend && npm run dev`
3. **Analyzer Service**: `cd packages/analyzer && python -m src.api.server`
4. **Vision Service**: Swift Service auf Port 8080

**Backend läuft auf**: `http://localhost:4001`
**Frontend läuft auf**: `http://localhost:3000`
**Qwen VL Service**: `http://localhost:8081`
