-- CreateTable
CREATE TABLE "saliency_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sceneId" TEXT,
    "videoId" TEXT NOT NULL,
    "dataPath" TEXT NOT NULL,
    "heatmapPath" TEXT,
    "roiData" TEXT NOT NULL,
    "frameCount" INTEGER NOT NULL,
    "sampleRate" INTEGER NOT NULL DEFAULT 1,
    "modelVersion" TEXT NOT NULL,
    "processingTime" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saliency_analyses_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saliency_analyses_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "saliency_analyses_sceneId_idx" ON "saliency_analyses"("sceneId");

-- CreateIndex
CREATE INDEX "saliency_analyses_videoId_idx" ON "saliency_analyses"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "saliency_analyses_sceneId_key" ON "saliency_analyses"("sceneId");
