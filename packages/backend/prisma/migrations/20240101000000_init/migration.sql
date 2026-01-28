-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "duration" DOUBLE PRECISION,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "folderId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analyzedAt" TIMESTAMP(3),

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "keyframePath" TEXT,
    "visionData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_logs" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vision_analyses" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "objects" TEXT,
    "objectCount" INTEGER NOT NULL DEFAULT 0,
    "faces" TEXT,
    "faceCount" INTEGER NOT NULL DEFAULT 0,
    "sceneClassification" TEXT,
    "customObjects" TEXT,
    "sceneCategory" TEXT,
    "customObjectCount" INTEGER NOT NULL DEFAULT 0,
    "aiDescription" TEXT,
    "aiTags" TEXT,
    "textRecognitions" TEXT,
    "textCount" INTEGER NOT NULL DEFAULT 0,
    "humanRectangles" TEXT,
    "humanCount" INTEGER NOT NULL DEFAULT 0,
    "humanBodyPoses" TEXT,
    "poseCount" INTEGER NOT NULL DEFAULT 0,
    "processingTime" DOUBLE PRECISION,
    "visionVersion" TEXT NOT NULL,
    "coreMLVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vision_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "segments" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_stems" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "sceneId" TEXT,
    "projectSceneId" TEXT,
    "stemType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION,
    "startTime" DOUBLE PRECISION,
    "endTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_stems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_indices" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "sceneId" TEXT,
    "content" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION,
    "endTime" DOUBLE PRECISION,
    "embedding" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_indices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_scenes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "trimStart" DOUBLE PRECISION,
    "trimEnd" DOUBLE PRECISION,
    "audioLevel" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_history" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_segments" (
    "id" TEXT NOT NULL,
    "audioStemId" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "originalText" TEXT NOT NULL,
    "originalFilePath" TEXT NOT NULL,
    "editedText" TEXT,
    "voiceId" TEXT,
    "voiceName" TEXT,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "similarityBoost" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "style" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "useSpeakerBoost" BOOLEAN NOT NULL DEFAULT true,
    "reVoicedFilePath" TEXT,
    "reVoicedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ORIGINAL',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_clones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "elevenLabsVoiceId" TEXT NOT NULL,
    "sourceAudioPath" TEXT,
    "language" TEXT,
    "gender" TEXT,
    "ageRange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_clones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "videos_folderId_idx" ON "videos"("folderId");

-- CreateIndex
CREATE INDEX "scenes_videoId_idx" ON "scenes"("videoId");

-- CreateIndex
CREATE INDEX "analysis_logs_videoId_idx" ON "analysis_logs"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "vision_analyses_sceneId_key" ON "vision_analyses"("sceneId");
CREATE INDEX "vision_analyses_sceneId_idx" ON "vision_analyses"("sceneId");
CREATE INDEX "vision_analyses_sceneCategory_idx" ON "vision_analyses"("sceneCategory");

-- CreateIndex
CREATE INDEX "folders_parentId_idx" ON "folders"("parentId");

-- CreateIndex
CREATE INDEX "transcriptions_videoId_idx" ON "transcriptions"("videoId");

-- CreateIndex
CREATE INDEX "audio_stems_videoId_idx" ON "audio_stems"("videoId");
CREATE INDEX "audio_stems_sceneId_idx" ON "audio_stems"("sceneId");
CREATE INDEX "audio_stems_projectSceneId_idx" ON "audio_stems"("projectSceneId");
CREATE INDEX "audio_stems_stemType_idx" ON "audio_stems"("stemType");

-- CreateIndex
CREATE INDEX "search_indices_videoId_idx" ON "search_indices"("videoId");
CREATE INDEX "search_indices_sceneId_idx" ON "search_indices"("sceneId");
CREATE INDEX "search_indices_contentType_idx" ON "search_indices"("contentType");

-- CreateIndex
CREATE INDEX "project_scenes_projectId_idx" ON "project_scenes"("projectId");
CREATE INDEX "project_scenes_order_idx" ON "project_scenes"("order");

-- CreateIndex
CREATE INDEX "project_history_projectId_idx" ON "project_history"("projectId");

-- CreateIndex
CREATE INDEX "voice_segments_audioStemId_idx" ON "voice_segments"("audioStemId");
CREATE INDEX "voice_segments_status_idx" ON "voice_segments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "voice_clones_elevenLabsVoiceId_key" ON "voice_clones"("elevenLabsVoiceId");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_logs" ADD CONSTRAINT "analysis_logs_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vision_analyses" ADD CONSTRAINT "vision_analyses_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_stems" ADD CONSTRAINT "audio_stems_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audio_stems" ADD CONSTRAINT "audio_stems_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audio_stems" ADD CONSTRAINT "audio_stems_projectSceneId_fkey" FOREIGN KEY ("projectSceneId") REFERENCES "project_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_indices" ADD CONSTRAINT "search_indices_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "search_indices" ADD CONSTRAINT "search_indices_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_scenes" ADD CONSTRAINT "project_scenes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_scenes" ADD CONSTRAINT "project_scenes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_history" ADD CONSTRAINT "project_history_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_segments" ADD CONSTRAINT "voice_segments_audioStemId_fkey" FOREIGN KEY ("audioStemId") REFERENCES "audio_stems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
