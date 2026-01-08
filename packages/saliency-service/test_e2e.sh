#!/bin/bash
# End-to-End Test Script für Saliency Detection Service
# Testet den kompletten Workflow mit echtem Video

set -e

echo "🎬 Starting End-to-End Tests for Saliency Detection Service"

# Service-URLs
SALIENCY_SERVICE_URL="http://localhost:8002"
BACKEND_URL="http://localhost:3001"

# Test-Video (verwende vorhandenes Video)
TEST_VIDEO="/Volumes/DOCKER_EXTERN/prismvid/1760983826974_UDG_Elevator_Pitch_Bosch_v3.mp4"
VIDEO_ID="test_saliency_e2e_$(date +%s)"

echo "📹 Using test video: $TEST_VIDEO"
echo "🆔 Video ID: $VIDEO_ID"

# 1. Health Check
echo "🔍 Testing Health Check..."
curl -f "$SALIENCY_SERVICE_URL/health" || {
    echo "❌ Health check failed"
    exit 1
}
echo "✅ Health check passed"

# 2. Backend Health Check
echo "🔍 Testing Backend Health Check..."
curl -f "$BACKEND_URL/api/health" || {
    echo "❌ Backend health check failed"
    exit 1
}
echo "✅ Backend health check passed"

# 3. Video-Analyse starten
echo "🎯 Starting Video Analysis..."
ANALYZE_RESPONSE=$(curl -s -X POST "$SALIENCY_SERVICE_URL/analyze" \
    -H "Content-Type: application/json" \
    -d "{
        \"videoId\": \"$VIDEO_ID\",
        \"videoPath\": \"$TEST_VIDEO\",
        \"sampleRate\": 10,
        \"aspectRatio\": [9, 16],
        \"maxFrames\": 20
    }")

echo "📊 Analysis Response: $ANALYZE_RESPONSE"

# Prüfe dass Analyse gestartet wurde
if echo "$ANALYZE_RESPONSE" | grep -q "ANALYZING"; then
    echo "✅ Video analysis started successfully"
else
    echo "❌ Video analysis failed to start"
    exit 1
fi

# 4. Warten auf Analyse-Abschluss (mit Timeout)
echo "⏳ Waiting for analysis to complete..."
TIMEOUT=300  # 5 Minuten
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS_RESPONSE=$(curl -s "$BACKEND_URL/api/videos/$VIDEO_ID" || echo "{}")
    
    if echo "$STATUS_RESPONSE" | grep -q "ANALYZED"; then
        echo "✅ Video analysis completed"
        break
    elif echo "$STATUS_RESPONSE" | grep -q "ERROR"; then
        echo "❌ Video analysis failed"
        exit 1
    fi
    
    echo "⏳ Still analyzing... ($ELAPSED/$TIMEOUT seconds)"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ Analysis timeout after $TIMEOUT seconds"
    exit 1
fi

# 5. Saliency-Daten abrufen
echo "📊 Retrieving Saliency Data..."
SALIENCY_DATA=$(curl -s "$SALIENCY_SERVICE_URL/saliency/$VIDEO_ID")

if echo "$SALIENCY_DATA" | grep -q "videoId"; then
    echo "✅ Saliency data retrieved successfully"
else
    echo "❌ Failed to retrieve saliency data"
    exit 1
fi

# 6. Heatmap-Generierung starten
echo "🎨 Starting Heatmap Generation..."
HEATMAP_RESPONSE=$(curl -s -X POST "$SALIENCY_SERVICE_URL/generate-heatmap" \
    -H "Content-Type: application/json" \
    -d "{
        \"videoId\": \"$VIDEO_ID\",
        \"colormap\": \"jet\",
        \"opacity\": 0.5
    }")

echo "📊 Heatmap Response: $HEATMAP_RESPONSE"

if echo "$HEATMAP_RESPONSE" | grep -q "started"; then
    echo "✅ Heatmap generation started successfully"
else
    echo "❌ Heatmap generation failed to start"
    exit 1
fi

# 7. Alle Visualisierungen generieren
echo "🎬 Starting All Visualizations Generation..."
ALL_VIZ_RESPONSE=$(curl -s -X POST "$SALIENCY_SERVICE_URL/generate-all-visualizations" \
    -H "Content-Type: application/json" \
    -d "{\"video_id\": \"$VIDEO_ID\"}")

echo "📊 All Visualizations Response: $ALL_VIZ_RESPONSE"

if echo "$ALL_VIZ_RESPONSE" | grep -q "started"; then
    echo "✅ All visualizations generation started successfully"
else
    echo "❌ All visualizations generation failed to start"
    exit 1
fi

# 8. Warten auf Visualisierungen (mit Timeout)
echo "⏳ Waiting for visualizations to complete..."
TIMEOUT=600  # 10 Minuten
ELAPSED=0
INTERVAL=30

while [ $ELAPSED -lt $TIMEOUT ]; do
    # Prüfe ob Heatmap-Video existiert
    HEATMAP_PATH="/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/$VIDEO_ID/heatmap_video.mp4"
    
    if [ -f "$HEATMAP_PATH" ]; then
        echo "✅ Heatmap video generated: $HEATMAP_PATH"
        break
    fi
    
    echo "⏳ Still generating visualizations... ($ELAPSED/$TIMEOUT seconds)"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ Visualization generation timeout after $TIMEOUT seconds"
    exit 1
fi

# 9. Prüfe generierte Dateien
echo "📁 Checking generated files..."
SALIENCY_DIR="/Volumes/DOCKER_EXTERN/prismvid/storage/saliency/$VIDEO_ID"

if [ -d "$SALIENCY_DIR" ]; then
    echo "✅ Saliency directory created: $SALIENCY_DIR"
    
    # Liste alle generierten Dateien
    echo "📄 Generated files:"
    ls -la "$SALIENCY_DIR"
    
    # Prüfe wichtige Dateien
    if [ -f "$SALIENCY_DIR/saliency_data.json" ]; then
        echo "✅ Saliency data JSON file exists"
    else
        echo "❌ Saliency data JSON file missing"
        exit 1
    fi
    
    if [ -f "$SALIENCY_DIR/heatmap_video.mp4" ]; then
        echo "✅ Heatmap video file exists"
    else
        echo "❌ Heatmap video file missing"
        exit 1
    fi
    
    if [ -f "$SALIENCY_DIR/comparison_video.mp4" ]; then
        echo "✅ Comparison video file exists"
    else
        echo "❌ Comparison video file missing"
        exit 1
    fi
    
    if [ -f "$SALIENCY_DIR/roi_suggestions.json" ]; then
        echo "✅ ROI suggestions JSON file exists"
    else
        echo "❌ ROI suggestions JSON file missing"
        exit 1
    fi
    
else
    echo "❌ Saliency directory not created"
    exit 1
fi

# 10. Performance-Metriken
echo "📊 Performance Metrics:"
if [ -f "$SALIENCY_DIR/saliency_data.json" ]; then
    FRAME_COUNT=$(jq '.frames | length' "$SALIENCY_DIR/saliency_data.json")
    PROCESSING_TIME=$(jq '.metadata.processing_stats.processing_time' "$SALIENCY_DIR/saliency_data.json")
    
    echo "   Frames analyzed: $FRAME_COUNT"
    echo "   Processing time: ${PROCESSING_TIME}s"
    echo "   FPS processed: $(echo "scale=2; $FRAME_COUNT / $PROCESSING_TIME" | bc)"
fi

# 11. Cleanup (optional)
echo "🧹 Cleanup (optional)..."
read -p "Do you want to clean up test files? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$SALIENCY_DIR"
    echo "✅ Test files cleaned up"
else
    echo "📁 Test files kept in: $SALIENCY_DIR"
fi

echo "🎉 End-to-End Tests completed successfully!"
echo "📊 Summary:"
echo "   ✅ Health checks passed"
echo "   ✅ Video analysis completed"
echo "   ✅ Saliency data generated"
echo "   ✅ Heatmap video created"
echo "   ✅ Comparison video created"
echo "   ✅ ROI suggestions generated"
echo "   ✅ All visualizations completed"
echo ""
echo "🎬 The Saliency Detection Service is working correctly!"
echo "🔗 Service URL: $SALIENCY_SERVICE_URL"
echo "📖 API Documentation: $SALIENCY_SERVICE_URL/docs"
