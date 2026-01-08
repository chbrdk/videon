#!/usr/bin/env python3
"""
Qwen VL Video Analysis Test
Analysiert ein Video mit mehreren Frames
"""
import sys
import os
from pathlib import Path
import time

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from services.qwen_service import QwenVLService
from loguru import logger
import subprocess

def extract_video_frames_ffmpeg(video_path: str, num_frames: int = 5, output_dir: str = None) -> list:
    """
    Extrahiert Keyframes aus einem Video
    
    Args:
        video_path: Pfad zum Video
        num_frames: Anzahl Frames zu extrahieren
        output_dir: Ausgabe-Verzeichnis (optional)
    
    Returns:
        Liste von Frame-Pfaden
    """
    if output_dir is None:
        output_dir = Path(video_path).parent / "qwen_frames"
    else:
        output_dir = Path(output_dir)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Extracting {num_frames} frames from video...")
    
    # Verwende ffmpeg um Frames zu extrahieren
    video_name = Path(video_path).stem
    frame_pattern = str(output_dir / f"{video_name}_frame_%03d.jpg")
    
    # Extrahiere gleichmäßig verteilte Frames
    duration_cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
        video_path
    ]
    
    try:
        duration_str = subprocess.check_output(duration_cmd, stderr=subprocess.DEVNULL).decode().strip()
        duration = float(duration_str)
        interval = duration / (num_frames + 1)
        
        frame_paths = []
        for i in range(1, num_frames + 1):
            timestamp = i * interval
            frame_path = output_dir / f"{video_name}_frame_{i:03d}.jpg"
            
            # Extrahiere Frame bei timestamp
            cmd = [
                "ffmpeg", "-y", "-ss", str(timestamp),
                "-i", video_path,
                "-vframes", "1",
                "-q:v", "2",  # High quality
                str(frame_path)
            ]
            
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            frame_paths.append(str(frame_path.absolute()))
            logger.info(f"  Extracted frame {i}/{num_frames} at {timestamp:.2f}s")
        
        return frame_paths
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to extract frames: {e}")
        return []
    except FileNotFoundError:
        logger.error("ffmpeg/ffprobe not found. Please install ffmpeg.")
        return []

def main():
    logger.info("🎬 Qwen VL Video Analysis Test")
    logger.info("=" * 50)
    
    # Prüfe Argumente
    if len(sys.argv) < 2:
        logger.error("Usage: python test_video.py <video_path> [num_frames]")
        return 1
    
    video_path = sys.argv[1]
    num_frames = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    
    if not Path(video_path).exists():
        logger.error(f"Video not found: {video_path}")
        return 1
    
    logger.info(f"📹 Video: {video_path}")
    logger.info(f"📊 Frames to extract: {num_frames}")
    logger.info("")
    
    # Schritt 1: Frames extrahieren oder vorhandene Keyframes nutzen
    logger.info("1️⃣  Getting video frames...")
    
    # Versuche erst Frames mit ffmpeg zu extrahieren
    frame_paths = extract_video_frames_ffmpeg(video_path, num_frames)
    
    # Fallback: Nutze vorhandene Keyframes aus Storage
    if not frame_paths:
        logger.info("   ffmpeg not available, using existing keyframes...")
        keyframes_dir = Path(video_path).parent.parent / "keyframes"
        if keyframes_dir.exists():
            # Finde alle Keyframes (können für verschiedene Videos sein)
            all_keyframes = list(keyframes_dir.glob("*.jpg"))
            if all_keyframes:
                # Nimm die ersten N Keyframes
                frame_paths = [str(kf.absolute()) for kf in all_keyframes[:num_frames]]
                logger.info(f"   Found {len(frame_paths)} existing keyframes")
    
    if not frame_paths:
        logger.error("❌ No frames available. Install ffmpeg or provide frame paths manually.")
        return 1
    
    logger.info(f"✅ Extracted {len(frame_paths)} frames")
    logger.info("")
    
    # Schritt 2: Qwen Service initialisieren
    logger.info("2️⃣  Initializing Qwen VL Service...")
    try:
        service = QwenVLService(
            model_name="mlx-community/Qwen3-VL-8B-Instruct-3bit",
            max_tokens=800,
            temperature=0.0
        )
    except Exception as e:
        logger.error(f"❌ Failed to initialize service: {e}")
        return 1
    
    # Schritt 3: Model laden
    logger.info("3️⃣  Loading model...")
    start_time = time.time()
    try:
        service.load_model()
        load_time = time.time() - start_time
        logger.info(f"✅ Model loaded in {load_time:.2f} seconds")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        return 1
    
    logger.info("")
    
    # Schritt 4: Video-Analyse durchführen
    logger.info("4️⃣  Analyzing video frames...")
    start_time = time.time()
    
    try:
        result = service.analyze_video_frames(
            frame_paths=frame_paths,
            prompt="Analysiere diese Video-Frames. Was passiert in diesem Video? Beschreibe die Story, die Personen, Aktivitäten und den Kontext. Erstelle eine zusammenhängende Video-Beschreibung.",
            max_tokens=800
        )
        
        analysis_time = time.time() - start_time
        
        logger.info(f"✅ Video analysis complete in {analysis_time:.2f} seconds")
        logger.info("")
        logger.info("📝 Video Description:")
        logger.info("-" * 50)
        logger.info(result.get("video_description", "N/A"))
        logger.info("-" * 50)
        logger.info("")
        logger.info(f"📊 Stats:")
        logger.info(f"   Frames analyzed: {result.get('frame_count', 0)}")
        logger.info(f"   Analysis time: {analysis_time:.2f}s")
        logger.info(f"   Avg per frame: {analysis_time / len(frame_paths):.2f}s")
        
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    logger.info("")
    logger.info("✅ Video Analysis Test successful!")
    return 0

if __name__ == "__main__":
    sys.exit(main())

