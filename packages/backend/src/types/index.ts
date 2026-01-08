export interface VideoUploadRequest {
  video: Express.Multer.File;
}

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
  file_path?: string; // Add file_path for audio service
}

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

export interface SceneResponse {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  keyframePath?: string;
  visionData?: VisionData;
  createdAt: string;
}

export interface AnalysisLogMetadata {
  sceneCount?: number;
  keyframesExtracted?: number;
  visionAnalysis?: string;
  stemsCreated?: number;
  stemTypes?: string[];
  [key: string]: unknown;
}

export interface AnalysisLogResponse {
  id: string;
  videoId: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  metadata?: AnalysisLogMetadata;
  createdAt: string;
}

export interface VideoWithScenesResponse extends VideoResponse {
  scenes: SceneResponse[];
  analysisLogs: AnalysisLogResponse[];
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  scenes: ProjectSceneResponse[];
}

export interface ProjectSceneResponse {
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

export interface AudioStemResponse {
  id: string;
  videoId: string;
  stemType: 'vocals' | 'music' | 'other';
  filePath: string;
  fileSize: number;
  createdAt: string;
}

export interface FolderResponse {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  videos?: VideoResponse[];
}

export interface SearchResultResponse {
  type: 'video' | 'scene';
  id: string;
  videoId: string;
  videoTitle: string;
  content: string;
  startTime?: number;
  endTime?: number;
  relevanceScore: number;
}

export interface TranscriptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface TranscriptionResponse {
  id: string;
  videoId: string;
  language: string;
  segments: TranscriptionSegment[];
  createdAt: string;
}
