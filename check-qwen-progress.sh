#!/bin/bash

# Check Qwen VL analysis progress

echo "📊 Qwen VL Analysis Progress"
echo "=============================="
echo ""

docker exec prismvid-postgres psql -U prismvid -d prismvid -c "
SELECT 
  COUNT(DISTINCT v.id) as total_videos,
  COUNT(DISTINCT CASE WHEN va.\"qwenVLProcessed\" = true AND va.\"qwenVLDescription\" IS NOT NULL AND va.\"qwenVLDescription\" != '' THEN v.id END) as fully_analyzed,
  COUNT(s.id) as total_scenes,
  SUM(CASE WHEN va.\"qwenVLProcessed\" = true AND va.\"qwenVLDescription\" IS NOT NULL AND va.\"qwenVLDescription\" != '' THEN 1 ELSE 0 END) as scenes_analyzed,
  ROUND(COUNT(DISTINCT CASE WHEN va.\"qwenVLProcessed\" = true THEN v.id END)::numeric / COUNT(DISTINCT v.id) * 100, 2) as percent_videos,
  ROUND(SUM(CASE WHEN va.\"qwenVLProcessed\" = true THEN 1 ELSE 0 END)::numeric / COUNT(s.id) * 100, 2) as percent_scenes
FROM videos v
INNER JOIN scenes s ON s.\"videoId\" = v.id
LEFT JOIN vision_analyses va ON va.\"sceneId\" = s.id;
"

echo ""
echo "📋 Videos noch zu analysieren:"
docker exec prismvid-postgres psql -U prismvid -d prismvid -c "
SELECT COUNT(*) as remaining
FROM videos v
WHERE EXISTS (SELECT 1 FROM scenes s WHERE s.\"videoId\" = v.id)
AND NOT EXISTS (
  SELECT 1 
  FROM scenes s2 
  INNER JOIN vision_analyses va ON va.\"sceneId\" = s2.id 
  WHERE s2.\"videoId\" = v.id 
    AND va.\"qwenVLProcessed\" = true 
    AND va.\"qwenVLDescription\" IS NOT NULL 
    AND va.\"qwenVLDescription\" != ''
);
"
