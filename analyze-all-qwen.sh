#!/bin/bash

# Analyze all videos that don't have Qwen VL analysis yet

echo "🔍 Finding videos without Qwen VL analysis..."

# Get video IDs that have scenes but no Qwen VL analysis
VIDEO_IDS=$(docker exec prismvid-postgres psql -U prismvid -d prismvid -t -c "
SELECT v.id 
FROM videos v
WHERE EXISTS (
  SELECT 1 FROM scenes s WHERE s.\"videoId\" = v.id
)
AND (
  NOT EXISTS (
    SELECT 1 
    FROM scenes s2 
    INNER JOIN vision_analyses va ON va.\"sceneId\" = s2.id 
    WHERE s2.\"videoId\" = v.id 
      AND va.\"qwenVLProcessed\" = true 
      AND va.\"qwenVLDescription\" IS NOT NULL 
      AND va.\"qwenVLDescription\" != ''
  )
)
ORDER BY v.\"uploadedAt\" DESC;
" | tr -d ' ')

if [ -z "$VIDEO_IDS" ]; then
  echo "✅ All videos with scenes have Qwen VL analysis"
  exit 0
fi

VIDEO_COUNT=$(echo "$VIDEO_IDS" | grep -v '^$' | wc -l | tr -d ' ')
echo "📊 Found $VIDEO_COUNT video(s) to analyze"

# Trigger Qwen VL analysis for each video
COUNT=0
for VIDEO_ID in $VIDEO_IDS; do
  if [ ! -z "$VIDEO_ID" ]; then
    COUNT=$((COUNT + 1))
    
    # Get video name
    VIDEO_NAME=$(docker exec prismvid-postgres psql -U prismvid -d prismvid -t -c "SELECT \"originalName\" FROM videos WHERE id = '$VIDEO_ID';" | tr -d ' ')
    
    echo ""
    echo "[$COUNT/$VIDEO_COUNT] 🎬 Analyzing: $VIDEO_NAME"
    echo "           Video ID: $VIDEO_ID"
    
    RESPONSE=$(curl -s -X POST "http://192.168.50.101:4001/api/videos/$VIDEO_ID/qwenVL/analyze" 2>&1)
    
    if echo "$RESPONSE" | grep -q "Qwen VL analysis started"; then
      echo "           ✅ Analysis started"
    elif echo "$RESPONSE" | grep -q "not available"; then
      echo "           ⚠️  Qwen VL Service not available"
      break
    else
      echo "           ❌ Error: $RESPONSE"
    fi
    
    # Small delay to avoid overwhelming the service
    sleep 1
  fi
done

echo ""
echo "✅ Triggered Qwen VL analysis for $COUNT video(s)"
echo "⏳ Analysis is running in background. This may take a while..."
echo "💡 Check progress with: docker-compose logs -f backend | grep 'Qwen VL'"
