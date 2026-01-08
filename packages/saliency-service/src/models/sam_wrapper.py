"""
SAM 2.1 Wrapper mit intelligenter Fallback-Logik für Apple Silicon M4
Verwendet Segment Anything Model 2.1 wenn verfügbar, sonst SAM 1 als Fallback
"""
import os
import numpy as np
import cv2
from typing import List, Dict, Any, Optional, Tuple
import torch
import json
from pathlib import Path
import logging

# Try to import SAM 2.1 first, fallback to SAM 1
SAM2_AVAILABLE = False
SAM1_AVAILABLE = False

try:
    # Try SAM 2.1 (requires Python 3.10+)
    from sam2.build_sam import build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
    SAM2_AVAILABLE = True
    print("✅ SAM 2.1 successfully imported")
except ImportError as e:
    print(f"⚠️ SAM 2.1 not available: {e}")
    try:
        # Fallback to SAM 1
        from segment_anything import sam_model_registry, SamPredictor
        SAM1_AVAILABLE = True
        print("✅ SAM 1 successfully imported as fallback")
    except ImportError as e2:
        print(f"❌ Neither SAM 2.1 nor SAM 1 available: {e2}")
        raise RuntimeError("No SAM implementation available")

# Absolute imports für lokale Tests
try:
    from ..utils.logger import logger, log_performance
except ImportError:
    # Fallback für lokale Tests
    logger = logging.getLogger(__name__)
    def log_performance(*args, **kwargs):
        pass

class SAMSaliencyModel:
    """Intelligenter SAM Wrapper mit SAM 2.1 bevorzugt, SAM 1 als Fallback"""
    
    def __init__(self, model_type: str = "sam2.1_large", use_coreml: bool = False):
        """
        Initialisiert SAM Model (SAM 2.1 bevorzugt, SAM 1 als Fallback)
        
        Args:
            model_type: Modell-Typ ("sam2.1_large", "sam2.1_hiera_large", "vit_b", "vit_l", "vit_h")
            use_coreml: Ob Core ML verwendet werden soll (nur für SAM 1)
        """
        self.model_type = model_type
        self.use_coreml = use_coreml
        self.model = None
        self.predictor = None
        self.device = self._get_device()
        self.model_path = self._get_model_path()
        
        logger.info(f"Initializing SAM {model_type} with Core ML: {use_coreml}")
        
        # Versuche SAM 2.1 zuerst
        if SAM2_AVAILABLE and model_type.startswith("sam2.1"):
            self._load_sam2_model()
        elif SAM1_AVAILABLE:
            self._load_sam1_model()
        else:
            raise RuntimeError("No SAM implementation available")
    
    def _get_device(self) -> str:
        """Bestimmt das beste Device für Apple Silicon M4"""
        if torch.backends.mps.is_available():
            logger.info("💻 Verwende MPS für Apple Silicon M4")
            return "mps"
        elif torch.cuda.is_available():
            logger.info("💻 Verwende CUDA")
            return "cuda"
        else:
            logger.info("💻 Verwende CPU für maximale Stabilität (M4 Memory Problem)")
            return "cpu"
    
    def _get_model_path(self) -> str:
        """Bestimmt den Pfad zum Modell basierend auf Typ"""
        models_dir = Path(__file__).parent.parent.parent / "models"
        models_dir.mkdir(exist_ok=True)
        
        if self.model_type.startswith("sam2.1"):
            # SAM 2.1 Modelle
            model_files = {
                "sam2.1_large": "sam2.1_large.pt",
                "sam2.1_hiera_large": "sam2.1_hiera_large.pt"
            }
            return str(models_dir / model_files.get(self.model_type, "sam2.1_large.pt"))
        else:
            # SAM 1 Modelle
            model_files = {
                "vit_b": "sam_vit_b_01ec64.pth",
                "vit_l": "sam_vit_l_0b3195.pth", 
                "vit_h": "sam_vit_h_4b8939.pth"
            }
            return str(models_dir / model_files.get(self.model_type, "sam_vit_b_01ec64.pth"))
    
    def _load_sam2_model(self):
        """Lädt SAM 2.1 Modell"""
        try:
            logger.info(f"Loading SAM 2.1 model: {self.model_type}")
            
            # SAM 2.1 Konfiguration
            sam2_checkpoint = self.model_path
            model_cfg = "sam2.1_large.yaml" if "large" in self.model_type else "sam2.1_hiera_large.yaml"
            
            # Build SAM 2.1
            self.model = build_sam2(model_cfg, sam2_checkpoint, device=self.device)
            self.predictor = SAM2ImagePredictor(self.model)
            
            logger.info(f"✅ SAM 2.1 {self.model_type} loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load SAM 2.1 model: {e}")
            logger.info("Falling back to SAM 1")
            self._load_sam1_model()
    
    def _load_sam1_model(self):
        """Lädt SAM 1 Modell als Fallback"""
        try:
            logger.info(f"Loading SAM 1 model: {self.model_type}")
            
            # SAM 1 Modell laden
            sam = sam_model_registry[self.model_type](checkpoint=self.model_path)
            sam.to(device=self.device)
            
            self.model = sam
            self.predictor = SamPredictor(sam)
            
            logger.info(f"✅ SAM 1 {self.model_type} loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load SAM 1 model: {e}")
            raise RuntimeError(f"SAM model loading failed: {e}")
    
    def detect_saliency(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Führt Saliency Detection auf einem Bild durch
        
        Args:
            image: Input Bild als numpy array (H, W, C)
            
        Returns:
            Dictionary mit Saliency-Daten
        """
        try:
            log_performance("saliency_detection_start")
            
            # Bild vorbereiten
            if len(image.shape) == 3:
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                image_rgb = image
            
            # SAM 2.1 vs SAM 1 unterschiedliche Behandlung
            if SAM2_AVAILABLE and hasattr(self.predictor, 'set_image'):
                # SAM 2.1
                self.predictor.set_image(image_rgb)
                
                # Automatische Punkt-Generierung für Saliency
                h, w = image_rgb.shape[:2]
                points = self._generate_saliency_points(w, h)
                
                # Segmentierung mit SAM 2.1
                masks, scores, logits = self.predictor.predict(
                    point_coords=points,
                    point_labels=[1] * len(points),
                    multimask_output=True,
                )
                
                # Beste Maske auswählen
                best_mask_idx = np.argmax(scores)
                saliency_map = masks[best_mask_idx]
                
            else:
                # SAM 1 Fallback
                self.predictor.set_image(image_rgb)
                
                # Automatische Punkt-Generierung
                h, w = image_rgb.shape[:2]
                points = self._generate_saliency_points(w, h)
                
                # Segmentierung mit SAM 1
                masks, scores, logits = self.predictor.predict(
                    point_coords=points,
                    point_labels=[1] * len(points),
                    multimask_output=True,
                )
                
                # Beste Maske auswählen
                best_mask_idx = np.argmax(scores)
                saliency_map = masks[best_mask_idx]
            
            # ROI aus Saliency Map extrahieren
            roi_data = self._extract_roi_from_saliency(saliency_map, image_rgb.shape)
            
            result = {
                "saliency_map": saliency_map.astype(np.uint8),
                "roi_data": roi_data,
                "model_type": self.model_type,
                "sam_version": "2.1" if SAM2_AVAILABLE and self.model_type.startswith("sam2.1") else "1"
            }
            
            log_performance("saliency_detection_complete")
            return result
            
        except Exception as e:
            logger.error(f"Saliency detection failed: {e}")
            raise
    
    def _generate_saliency_points(self, width: int, height: int, num_points: int = 9) -> np.ndarray:
        """Generiert strategische Punkte für Saliency Detection"""
        points = []
        
        # Zentrum
        points.append([width // 2, height // 2])
        
        # Goldener Schnitt Punkte
        golden_ratio = 1.618
        center_x, center_y = width // 2, height // 2
        
        # Punkte um das Zentrum
        for i in range(1, num_points):
            angle = (2 * np.pi * i) / (num_points - 1)
            radius = min(width, height) * 0.2
            x = int(center_x + radius * np.cos(angle))
            y = int(center_y + radius * np.sin(angle))
            
            # Sicherstellen, dass Punkte im Bild sind
            x = max(0, min(width - 1, x))
            y = max(0, min(height - 1, y))
            points.append([x, y])
        
        return np.array(points)
    
    def _extract_roi_from_saliency(self, saliency_map: np.ndarray, image_shape: Tuple[int, int, int]) -> Dict[str, Any]:
        """Extrahiert ROI-Daten aus Saliency Map"""
        h, w = image_shape[:2]
        
        # Finde Konturen in der Saliency Map
        contours, _ = cv2.findContours(saliency_map, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            # Fallback: Zentrum des Bildes
            return {
                "x": w // 4,
                "y": h // 4, 
                "width": w // 2,
                "height": h // 2,
                "score": 0.5
            }
        
        # Größte Kontur finden
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Bounding Box berechnen
        x, y, width, height = cv2.boundingRect(largest_contour)
        
        # Score basierend auf Saliency Map Intensität
        roi_region = saliency_map[y:y+height, x:x+width]
        score = float(np.mean(roi_region)) / 255.0 if roi_region.size > 0 else 0.5
        
        return {
            "x": int(x),
            "y": int(y),
            "width": int(width),
            "height": int(height),
            "score": float(score)
        }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Gibt Informationen über das geladene Modell zurück"""
        return {
            "model_type": self.model_type,
            "sam_version": "2.1" if SAM2_AVAILABLE and self.model_type.startswith("sam2.1") else "1",
            "device": self.device,
            "use_coreml": self.use_coreml,
            "model_path": self.model_path,
            "sam2_available": SAM2_AVAILABLE,
            "sam1_available": SAM1_AVAILABLE
        }