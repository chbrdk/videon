#!/bin/bash

# Continuously analyze videos until all are done

MAX_ITERATIONS=20
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  
  echo ""
  echo "=========================================="
  echo "Iteration $ITERATION/$MAX_ITERATIONS"
  echo "=========================================="
  
  # Check remaining videos
  REMAINING=$(docker exec prismvid-postgres psql -U prismvid -d prismvid -t -c "
  SELECT COUNT(*)
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
  " | tr -d ' ')
  
  if [ "$REMAINING" = "0" ]; then
    echo "🎉 All videos analyzed!"
    ./check-qwen-progress.sh
    exit 0
  fi
  
  echo "📊 Videos remaining: $REMAINING"
  
  # Run analysis
  ./analyze-all-qwen.sh 2>&1 | grep -E "Analyzing:|Analysis started|not available" | head -10
  
  # Wait before next iteration
  echo "⏳ Waiting 60 seconds before next check..."
  sleep 60
done

echo "⚠️  Reached max iterations. Some videos may still be processing."
./check-qwen-progress.sh
