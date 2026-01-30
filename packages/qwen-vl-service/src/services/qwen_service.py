"""
Qwen VL Service - MLX-basiert für Apple Silicon
"""
import os
from typing import Optional, List, Dict, Any, Union
from pathlib import Path
from loguru import logger
import base64
import io
import tempfile
import uuid

try:
    from mlx_vlm import load, generate
    from mlx_vlm.utils import load as load_vlm_utils
    MLX_VLM_AVAILABLE = True
except ImportError:
    MLX_VLM_AVAILABLE = False
    logger.warning("mlx-vlm not available. Install with: pip install mlx-vlm")


class QwenVLService:
    """
    Qwen 3VL Service für semantische Video- und Bildanalyse
    Nutzt MLX für optimale Apple Silicon Performance
    """
    
    def __init__(
        self,
        model_name: str = "mlx-community/Qwen3-VL-8B-Instruct-4bit",
        max_tokens: int = 500,
        temperature: float = 0.0
    ):
        """
        Initialisiert Qwen VL Service
        
        Args:
            model_name: Hugging Face Model Name (MLX Format)
            max_tokens: Maximale Tokens für Response
            temperature: Sampling Temperature (0.0 = deterministisch)
        """
        if not MLX_VLM_AVAILABLE:
            raise RuntimeError(
                "mlx-vlm not installed. Install with: pip install mlx-vlm"
            )
        
        self.model_name = model_name
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.model = None
        self.tokenizer = None
        self.processor = None
        self._loaded = False
        
        logger.info(f"Initializing Qwen VL Service with model: {model_name}")
    
    def load_model(self) -> None:
        """Lädt das MLX Modell (einmalig beim ersten Aufruf)"""
        if self._loaded:
            return
        
        logger.info("Loading Qwen VL model (this may take a few seconds)...")
        try:
            # MLX VLM load gibt model und processor zurück
            self.model, self.processor = load(self.model_name)
            self.tokenizer = self.processor.tokenizer  # Tokenizer ist Teil des Processors
            self._loaded = True
            logger.info("✅ Qwen VL model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Qwen VL model: {e}")
            raise
    
    def analyze_image(
        self,
        image_path: Optional[str] = None,
        image_base64: Optional[str] = None,
        prompt: str = "Describe this scene in detail. What is happening in this image?",
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Analysiert ein einzelnes Bild mit Qwen VL
        
        Args:
            image_path: Pfad zum Bild (optional wenn image_base64 gegeben)
            image_base64: Base64 kodiertes Bild (optional wenn image_path gegeben)
            prompt: Prompt für die Analyse
            max_tokens: Maximale Tokens (optional, überschreibt default)
        
        Returns:
            Dictionary mit description und metadata
        """
        if not self._loaded:
            self.load_model()
        
        # Validiere Bild-Pfad
        image_path_obj = Path(image_path)
        # Determine image source
        temp_file_created = False
        image_path_obj = None

        if image_base64:
            # Handle Base64 image
            try:
                # Remove data URI prefix if present
                if "base64," in image_base64:
                    image_base64 = image_base64.split("base64,")[1]
                
                image_data = base64.b64decode(image_base64)
                temp_dir = Path(tempfile.gettempdir())
                temp_path = temp_dir / f"qwen_upload_{uuid.uuid4()}.jpg"
                
                # Verify it's a valid image
                from PIL import Image
                img = Image.open(io.BytesIO(image_data))
                img.save(temp_path, "JPEG")
                
                image_path_obj = temp_path
                temp_file_created = True
                logger.info(f"Created temp file from base64: {temp_path}")
            except Exception as e:
                raise ValueError(f"Invalid base64 image data: {e}")
        elif image_path:
            # Handle local file path
            image_path_obj = Path(image_path)
            if not image_path_obj.exists():
                raise FileNotFoundError(f"Image not found: {image_path}")
        else:
            raise ValueError("Either image_path or image_base64 must be provided")
        
        # Resize Bild um Memory-Probleme zu vermeiden (max 1024x1024)
        from PIL import Image
        img = Image.open(image_path_obj)
        original_size = (img.width, img.height)
        
        # Berechne neue Größe (max 1024px auf längster Seite)
        max_size = 1024
        if img.width > max_size or img.height > max_size:
            ratio = min(max_size / img.width, max_size / img.height)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"Resized image from {original_size[0]}x{original_size[1]} to {new_size[0]}x{new_size[1]}")
            
            # Speichere resized Bild temporär
            import tempfile
            temp_dir = Path(tempfile.gettempdir())
            temp_image_path = temp_dir / f"qwen_resized_{Path(image_path).stem}.jpg"
            img.save(temp_image_path, "JPEG", quality=85)
            image_path_obj = temp_image_path
            logger.info(f"Using resized image: {temp_image_path}")
        else:
            logger.info(f"Image size {original_size[0]}x{original_size[1]} is within limits, no resizing needed")
        
        logger.info(f"Analyzing image: {image_path}")
        
        try:
            # Qwen 3VL benötigt Chat Template Format mit Image-Token
            # Erstelle Messages im richtigen Format
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": str(image_path_obj.absolute())},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
            
            # Konvertiere Messages zu Prompt mit Chat Template
            formatted_prompt = self.processor.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            
            tokens = max_tokens or self.max_tokens
            
            # Generiere Response mit mlx-vlm API
            result = generate(
                self.model,
                self.processor,
                prompt=formatted_prompt,
                image=str(image_path_obj.absolute()),
                max_tokens=tokens,
                temperature=self.temperature,
                verbose=False
            )
            
            # Extrahiere Text aus GenerationResult
            response = result.text if hasattr(result, 'text') else str(result)
            
            logger.info("✅ Analysis complete")
            
            return {
                "description": response,
                "model": self.model_name,
                "prompt": prompt,
                "image_path": str(image_path_obj.absolute())
            }
            
        except Exception as e:
            logger.error(f"Error analyzing image: {e}")
            raise
        finally:
            # Cleanup temp file if we created one from base64
            if temp_file_created and image_path_obj and image_path_obj.exists():
                try:
                    os.remove(image_path_obj)
                    logger.info(f"Removed temp file: {image_path_obj}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to remove temp file {image_path_obj}: {cleanup_error}")
    
    def analyze_video_frames(
        self,
        frame_paths: Optional[List[str]] = None,
        frame_base64_images: Optional[List[str]] = None,
        prompt: str = "Describe what is happening in these video frames. What is the story or context?",
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Analysiert mehrere Video-Frames (für Video Summarization)
        
        Args:
            frame_paths: Liste von Pfaden zu Keyframes
            frame_base64_images: Liste von Base64 Keyframes
            prompt: Prompt für Video-Analyse
            max_tokens: Maximale Tokens
        
        Returns:
            Dictionary mit video_description und frame_descriptions
        """
        if not self._loaded:
            self.load_model()
        
        count = len(frame_paths) if frame_paths else len(frame_base64_images) if frame_base64_images else 0
        logger.info(f"Analyzing {count} video frames")
        
        temp_files = []
        valid_frames = []
        
        if frame_base64_images:
             # Process Base64 Frames
            try:
                temp_dir = Path(tempfile.gettempdir())
                for i, b64 in enumerate(frame_base64_images):
                    if "base64," in b64:
                        b64 = b64.split("base64,")[1]
                    
                    img_data = base64.b64decode(b64)
                    temp_path = temp_dir / f"qwen_frame_{uuid.uuid4()}_{i}.jpg"
                    
                    from PIL import Image
                    img = Image.open(io.BytesIO(img_data))
                    img.save(temp_path, "JPEG")
                    
                    valid_frames.append(str(temp_path))
                    temp_files.append(temp_path)
                logger.info(f"Created {len(temp_files)} temp frames from base64")
            except Exception as e:
                # Cleanup on error
                for p in temp_files:
                    try:
                        os.remove(p)
                    except: pass
                raise ValueError(f"Invalid base64 frame data: {e}")
        elif frame_paths:
             # Process File Paths
            for frame_path in frame_paths:
                if Path(frame_path).exists():
                    valid_frames.append(frame_path)
                else:
                    logger.warning(f"Frame not found: {frame_path}")
        else:
             raise ValueError("Either frame_paths or frame_base64_images must be provided")

        if not valid_frames:
            raise ValueError("No valid frames found")
        
        try:
            # Bei mehreren Frames: Verarbeite sie einzeln oder als Batch (je nach Memory)
            # Für jetzt: Verarbeite das repräsentativste Frame (Mitte) für Video-Zusammenfassung
            # Später können wir Frame-by-Frame analysieren und dann zusammenfassen
            
            # Wähle repräsentatives Frame (Mitte des Videos)
            representative_frame_idx = len(valid_frames) // 2
            representative_frame = valid_frames[representative_frame_idx]
            
            logger.info(f"Using representative frame {representative_frame_idx + 1}/{len(valid_frames)}: {Path(representative_frame).name}")
            
            # Resize Frame um Memory-Probleme zu vermeiden
            from PIL import Image
            import tempfile
            frame_img = Image.open(representative_frame)
            original_size = (frame_img.width, frame_img.height)
            max_size = 1024
            
            frame_path_processed = representative_frame
            if frame_img.width > max_size or frame_img.height > max_size:
                ratio = min(max_size / frame_img.width, max_size / frame_img.height)
                new_size = (int(frame_img.width * ratio), int(frame_img.height * ratio))
                frame_img = frame_img.resize(new_size, Image.Resampling.LANCZOS)
                logger.info(f"Resized frame from {original_size[0]}x{original_size[1]} to {new_size[0]}x{new_size[1]}")
                
                temp_dir = Path(tempfile.gettempdir())
                temp_frame_path = temp_dir / f"qwen_frame_{Path(representative_frame).stem}.jpg"
                frame_img.save(temp_frame_path, "JPEG", quality=85)
                frame_path_processed = str(temp_frame_path)
            
            # Erstelle Messages für repräsentatives Frame
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": str(Path(frame_path_processed).absolute())},
                        {"type": "text", "text": f"{prompt} (This is a representative frame from a video with {len(valid_frames)} keyframes.)"}
                    ]
                }
            ]
            
            # Konvertiere Messages zu Prompt mit Chat Template
            formatted_prompt = self.processor.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            
            tokens = max_tokens or self.max_tokens
            
            # Generiere Video-Zusammenfassung basierend auf repräsentativem Frame
            result = generate(
                self.model,
                self.processor,
                prompt=formatted_prompt,
                image=str(Path(frame_path_processed).absolute()),
                max_tokens=tokens,
                temperature=self.temperature,
                verbose=False
            )
            
            # Extrahiere Text aus GenerationResult
            response = result.text if hasattr(result, 'text') else str(result)
            
            logger.info("✅ Video analysis complete")
            
            return {
                "video_description": response,
                "frame_count": len(valid_frames),
                "frames_analyzed": 1,  # Nur repräsentatives Frame analysiert
                "representative_frame": str(Path(representative_frame).name),
                "model": self.model_name,
                "prompt": prompt
            }
            
        except Exception as e:
            logger.error(f"Error analyzing video frames: {e}")
            raise
        finally:
            # Cleanup temp files
            for p in temp_files:
                if p.exists():
                    try:
                        os.remove(p)
                    except: pass
    
    def is_loaded(self) -> bool:
        """Prüft ob Modell geladen ist"""
        return self._loaded
    
    def get_model_info(self) -> Dict[str, Any]:
        """Gibt Model-Informationen zurück"""
        return {
            "model_name": self.model_name,
            "loaded": self._loaded,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature
        }

