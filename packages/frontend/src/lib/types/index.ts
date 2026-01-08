// Video types
export interface VideoResponse {
  id: string;
  filename: string;
  originalName: string;
  duration?: number;
  fileSize: number;
  mimeType: string;
  status: string;
  folderId?: string;
  folderName?: string;
  uploadedAt: string;
  analyzedAt?: string;
}

export interface SceneResponse {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  duration: number;
  thumbnailPath?: string;
  description?: string;
}

export interface AnalysisLog {
  id: string;
  videoId: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface VideoWithScenesResponse extends VideoResponse {
  scenes: SceneResponse[];
  analysisLogs: AnalysisLog[];
}

// Folder types
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface SearchResults {
  folders: Folder[];
  videos: VideoResponse[];
}

export interface CreateFolderDto {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderDto {
  name: string;
}

export interface DeleteFolderResponse {
  success: boolean;
  message: string;
}

export interface ContextMenuItem {
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  scenes: ProjectScene[];
}

export interface ProjectScene {
  id: string;
  projectId: string;
  videoId: string;
  startTime: number;
  endTime: number;
  order: number;
  audioLevel: number;
  trimStart?: number;
  trimEnd?: number;
  createdAt: string;
}

// Audio types
export interface AudioStem {
  id: string;
  videoId: string;
  stemType: 'vocals' | 'music' | 'other';
  filePath: string;
  fileSize: number;
  createdAt: string;
}

// Transcription types
export interface TranscriptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface Transcription {
  id: string;
  videoId: string;
  language: string;
  segments: TranscriptionSegment[];
  createdAt: string;
}

// Vision types
export interface VisionData {
  objects: VisionObject[];
  faces: VisionFace[];
  animals: VisionAnimal[];
  faceLandmarks: VisionFaceLandmark[];
  processingTime: number;
  visionVersion: string;
}

export interface VisionObject {
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface VisionFace {
  confidence: number;
  boundingBox: BoundingBox;
  landmarks?: VisionFaceLandmark[];
}

export interface VisionAnimal {
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface VisionFaceLandmark {
  type: string;
  position: { x: number; y: number };
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Search types
export interface SearchResult {
  type: 'video' | 'scene';
  id: string;
  videoId: string;
  videoTitle: string;
  content: string;
  startTime?: number;
  endTime?: number;
  relevanceScore: number;
}

// Timeline types
export interface TimelineClip {
  id: string;
  type: 'scene' | 'audio' | 'transcription';
  startTime: number;
  endTime: number;
  order: number;
  locked?: boolean;
  muted?: boolean;
  audioLevel?: number;
  data?: Record<string, unknown>;
}

export interface TrackConfig {
  id: string;
  type: 'scene' | 'audio' | 'transcription';
  name: string;
  visible: boolean;
  height: number;
  order: number;
  stemId?: string;
}
