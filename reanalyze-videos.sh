#!/bin/bash

# Reanalyze videos with 0 scenes

echo "🔍 Finding videos with 0 scenes..."

# Get video IDs with 0 scenes
VIDEO_IDS=$(docker exec prismvid-postgres psql -U prismvid -d prismvid -t -c "
SELECT v.id 
FROM videos v
LEFT JOIN scenes s ON s.\"videoId\" = v.id
GROUP BY v.id
HAVING COUNT(s.id) = 0
LIMIT 50;
" | tr -d ' ')

if [ -z "$VIDEO_IDS" ]; then
  echo "✅ No videos need reanalysis"
  exit 0
fi

echo "📊 Found videos to reanalyze:"
echo "$VIDEO_IDS" | wc -l | tr -d ' '

# Trigger analysis for each video
for VIDEO_ID in $VIDEO_IDS; do
  if [ ! -z "$VIDEO_ID" ]; then
    echo "🎬 Analyzing: $VIDEO_ID"
    curl -X POST "http://192.168.50.101:4001/api/videos/$VIDEO_ID/vision/analyze" 2>/dev/null
    echo ""
    sleep 2  # Wait a bit between requests
  fi
done

echo "✅ Reanalysis triggered for all videos"
