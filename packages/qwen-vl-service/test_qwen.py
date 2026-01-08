#!/usr/bin/env python3
"""
Qwen VL POC Test Script
Testet Qwen 3VL MLX Integration mit echten Keyframes
"""
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.services.qwen_service import QwenVLService
from loguru import logger
import time
from typing import Optional

def find_test_image():
    """Findet ein Test-Bild im Storage"""
    possible_paths = [
        "../../storage/keyframes",
        "../../storage/thumbnails",
        "../../storage"
    ]
    
    for base_path in possible_paths:
        base = Path(__file__).parent / base_path
        if base.exists():
            # Suche nach Bildern
            for ext in [".jpg", ".jpeg", ".png"]:
                images = list(base.glob(f"*{ext}"))
                if images:
                    return str(images[0].absolute())
    return None

def main():
    logger.info("🧪 Qwen VL POC Test")
    logger.info("=" * 50)
    
    # Prüfe ob mlx-vlm verfügbar ist
    try:
        from mlx_vlm import load
        logger.info("✅ mlx-vlm is available")
    except ImportError:
        logger.error("❌ mlx-vlm not installed!")
        logger.info("Install with: pip install mlx-vlm")
        return 1
    
    # Finde Test-Bild
    test_image = find_test_image()
    if not test_image:
        logger.error("❌ No test image found")
        logger.info("Please provide image path as argument or place image in storage/")
        if len(sys.argv) > 1:
            test_image = sys.argv[1]
        else:
            return 1
    
    logger.info(f"📸 Using test image: {test_image}")
    
    # Initialisiere Service
    logger.info("")
    logger.info("1️⃣  Initializing Qwen VL Service...")
    try:
        service = QwenVLService(
            model_name="mlx-community/Qwen3-VL-8B-Instruct-3bit",
            max_tokens=500,
            temperature=0.0
        )
    except Exception as e:
        logger.error(f"❌ Failed to initialize service: {e}")
        return 1
    
    # Test 1: Model Loading
    logger.info("")
    logger.info("2️⃣  Loading model (this may take a few seconds)...")
    start_time = time.time()
    try:
        service.load_model()
        load_time = time.time() - start_time
        logger.info(f"✅ Model loaded in {load_time:.2f} seconds")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        return 1
    
    # Test 2: Image Analysis
    logger.info("")
    logger.info("3️⃣  Analyzing image...")
    start_time = time.time()
    try:
        result = service.analyze_image(
            image_path=test_image,
            prompt="Beschreibe diese Szene detailliert. Was passiert in diesem Bild? Nenne Objekte, Personen, Aktivitäten und den Kontext."
        )
        analysis_time = time.time() - start_time
        
        logger.info(f"✅ Analysis complete in {analysis_time:.2f} seconds")
        logger.info("")
        logger.info("📝 Result:")
        logger.info("-" * 50)
        logger.info(result["description"])
        logger.info("-" * 50)
        
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    # Test 3: Model Info
    logger.info("")
    logger.info("4️⃣  Model Info:")
    info = service.get_model_info()
    for key, value in info.items():
        logger.info(f"   {key}: {value}")
    
    logger.info("")
    logger.info("✅ POC Test successful!")
    return 0

if __name__ == "__main__":
    sys.exit(main())

