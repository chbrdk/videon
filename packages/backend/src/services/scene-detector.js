const { exec } = require('child_process');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SceneDetector {
    constructor() {
        this.threshold = 15.0; // Senken von 30.0 auf 15.0 für empfindlichere Erkennung
    }

    async detectScenes(videoPath) {
        try {
            // Scene detection started - logging handled by caller
            
            // Use PySceneDetect with new API
            const pythonScript = `
import sys
import os
from typing import List, Tuple
from scenedetect import detect, ContentDetector, VideoManager, SceneManager

def detect_scenes(video_path: str) -> List[Tuple[float, float]]:
    if not os.path.exists(video_path):
        raise FileNotFoundError(f'Video file not found: {video_path}')

    try:
        # Use new scenedetect API
        scene_list = detect(video_path, ContentDetector(threshold=15.0))
        
        # Convert to list of tuples
        scenes = []
        for i, (start_time, end_time) in enumerate(scene_list):
            start_seconds = start_time.get_seconds()
            end_seconds = end_time.get_seconds()
            scenes.append((start_seconds, end_seconds))
        
        # If no scenes detected, create one scene for the entire video
        if len(scenes) == 0:
            # Get video duration using FFmpeg
            import subprocess
            import json
            
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json', 
                '-show_format', video_path
            ]
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, check=True)
                data = json.loads(result.stdout)
                duration = float(data['format']['duration'])
                
                # Create one scene for the entire video
                scenes.append((0.0, duration))
                print(f'No scene changes detected, creating single scene: 0.0s - {duration:.3f}s')
            except Exception as e:
                print(f'Error getting video duration: {e}')
                # Fallback: create a scene with unknown duration
                scenes.append((0.0, 60.0))  # Assume 60 seconds
                print('No scene changes detected, creating single scene: 0.0s - 60.0s (estimated)')
        
        return scenes
        
    except Exception as e:
        print(f'Error during scene detection: {e}')
        raise

# Main execution
if __name__ == "__main__":
    video_path = "${videoPath}"
    try:
        scenes = detect_scenes(video_path)
        print(f'DETECTED_SCENES:{len(scenes)}')
        for start, end in scenes:
            print(f'SCENE:{start:.3f}:{end:.3f}')
    except Exception as e:
        print(f'ERROR:{str(e)}')
`;

            // Write temporary Python script
            const tempScriptPath = path.join(__dirname, 'temp_scene_detector.py');
            require('fs').writeFileSync(tempScriptPath, pythonScript);

            // Execute Python script
            const { stdout, stderr } = await execAsync(`python3 "${tempScriptPath}"`);
            
            // Clean up
            require('fs').unlinkSync(tempScriptPath);

            if (stderr) {
                // Scene detection error - logging handled by caller
                throw new Error(stderr);
            }

            // Parse output
            const lines = stdout.trim().split('\n');
            let sceneCount = 0;
            const scenes = [];

            for (const line of lines) {
                if (line.startsWith('DETECTED_SCENES:')) {
                    sceneCount = parseInt(line.split(':')[1]);
                } else if (line.startsWith('SCENE:')) {
                    const parts = line.split(':');
                    const startTime = parseFloat(parts[1]);
                    const endTime = parseFloat(parts[2]);
                    scenes.push({ startTime, endTime });
                } else if (line.startsWith('ERROR:')) {
                    throw new Error(line.substring(6));
                }
            }

            // Scene detection completed - logging handled by caller
            return scenes;

        } catch (error) {
            // Scene detection failed - logging handled by caller
            throw error;
        }
    }
}

module.exports = SceneDetector;
