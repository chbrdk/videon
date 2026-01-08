#!/usr/bin/env python3
"""
SAM + DeepGaze Hybrid Approach
SAM findet Objekte, DeepGaze bewertet deren Wichtigkeit
"""

import cv2
import numpy as np
from typing import Tuple, List, Dict, Any, Optional
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class SAMDeepGazeHybrid:
    """
    Kombiniert SAM (Objekt-Segmentierung) mit DeepGaze-ähnlicher Saliency Detection
    """
    
    def __init__(self, sam_model_path: Optional[str] = None):
        """
        Initialisiert den Hybrid Detector
        
        Args:
            sam_model_path: Pfad zum SAM Modell (optional)
        """
        self.sam_model = None
        self.sam_predictor = None
        self.use_sam = False
        
        # Versuche SAM zu laden (optional)
        if sam_model_path and Path(sam_model_path).exists():
            self._load_sam_model(sam_model_path)
        
        # DeepGaze-ähnliche Saliency Detection
        self.face_cascade = self._load_face_detector()
        
    def _load_sam_model(self, model_path: str):
        """Lädt SAM Modell falls verfügbar"""
        try:
            # Hier würde SAM geladen werden
            # Für jetzt simulieren wir es
            logger.info(f"SAM model would be loaded from: {model_path}")
            self.use_sam = True
        except Exception as e:
            logger.warning(f"Could not load SAM model: {e}")
            self.use_sam = False
    
    def _load_face_detector(self):
        """Lädt OpenCV Face Detector"""
        try:
            cascade_paths = [
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml',
                '/usr/local/share/opencv4/haarcascades/haarcascade_frontalface_default.xml',
                '/opt/homebrew/share/opencv4/haarcascades/haarcascade_frontalface_default.xml'
            ]
            
            for path in cascade_paths:
                if Path(path).exists():
                    cascade = cv2.CascadeClassifier(path)
                    logger.info(f"Face detector loaded from: {path}")
                    return cascade
            
            logger.warning("Face detector not available")
            return None
        except Exception as e:
            logger.warning(f"Could not load face detector: {e}")
            return None
    
    def generate_saliency_map(self, image: np.ndarray) -> np.ndarray:
        """
        Generiert Saliency Map mit SAM + DeepGaze Hybrid
        
        Args:
            image: Input-Bild (BGR)
            
        Returns:
            Saliency Map (0-255)
        """
        try:
            height, width = image.shape[:2]
            
            # 1. SAM: Finde alle Objekte (simuliert)
            objects = self._find_objects_sam(image)
            
            # 2. DeepGaze-ähnliche Bewertung der Objekte
            object_saliency = self._evaluate_object_saliency(image, objects)
            
            # 3. Kombiniere mit traditionellen Saliency-Methoden
            traditional_saliency = self._compute_traditional_saliency(image)
            
            # 4. Erstelle finale Saliency Map
            saliency_map = self._combine_saliency_maps(
                object_saliency, traditional_saliency, height, width
            )
            
            logger.debug(f"Generated hybrid saliency map: {saliency_map.shape}, "
                        f"min={saliency_map.min()}, max={saliency_map.max()}")
            
            return saliency_map
            
        except Exception as e:
            logger.error(f"Error generating saliency map: {e}")
            return self._generate_center_saliency_map(height, width)
    
    def _find_objects_sam(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Simuliert SAM Objekt-Erkennung
        In der echten Implementierung würde hier SAM aufgerufen werden
        """
        objects = []
        
        if self.use_sam:
            # Hier würde SAM aufgerufen werden:
            # masks, scores, logits = self.sam_predictor.predict(...)
            # Für jetzt simulieren wir typische Objekte
            
            # Simuliere ein zentriertes Objekt (Person)
            height, width = image.shape[:2]
            center_x, center_y = width // 2, height // 2
            
            # Simuliere Person-ähnliches Objekt
            person_obj = {
                "mask": self._create_ellipse_mask(height, width, center_x, center_y, width//4, height//3),
                "bbox": (center_x - width//8, center_y - height//6, width//4, height//3),
                "score": 0.9,
                "class": "person",
                "center": (center_x, center_y)
            }
            objects.append(person_obj)
            
            # Simuliere weitere Objekte basierend auf Edge Detection
            edges = cv2.Canny(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for i, contour in enumerate(contours[:3]):  # Max 3 zusätzliche Objekte
                if cv2.contourArea(contour) > 1000:  # Nur größere Objekte
                    x, y, w, h = cv2.boundingRect(contour)
                    
                    # Erstelle Maske für dieses Objekt
                    mask = np.zeros((height, width), dtype=np.uint8)
                    cv2.fillPoly(mask, [contour], 255)
                    
                    obj = {
                        "mask": mask,
                        "bbox": (x, y, w, h),
                        "score": 0.7 - i * 0.1,  # Abnehmende Scores
                        "class": "object",
                        "center": (x + w//2, y + h//2)
                    }
                    objects.append(obj)
        
        logger.debug(f"Found {len(objects)} objects")
        return objects
    
    def _create_ellipse_mask(self, height: int, width: int, center_x: int, center_y: int, 
                           radius_x: int, radius_y: int) -> np.ndarray:
        """Erstellt eine elliptische Maske"""
        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.ellipse(mask, (center_x, center_y), (radius_x, radius_y), 0, 0, 360, 255, -1)
        return mask
    
    def _evaluate_object_saliency(self, image: np.ndarray, objects: List[Dict[str, Any]]) -> np.ndarray:
        """
        Bewertet die Saliency jedes Objekts (DeepGaze-ähnlich)
        """
        height, width = image.shape[:2]
        object_saliency = np.zeros((height, width), dtype=np.float32)
        
        for obj in objects:
            mask = obj["mask"]
            bbox = obj["bbox"]
            score = obj["score"]
            center = obj["center"]
            
            # DeepGaze-ähnliche Bewertung basierend auf:
            # 1. Objekt-Score (von SAM)
            # 2. Position (Center Bias)
            # 3. Größe (größere Objekte sind oft wichtiger)
            # 4. Kontrast zum Hintergrund
            
            # Center Bias
            center_x, center_y = width // 2, height // 2
            dist_from_center = np.sqrt((center[0] - center_x)**2 + (center[1] - center_y)**2)
            max_dist = np.sqrt(width**2 + height**2) / 2
            center_bias = 1.0 - (dist_from_center / max_dist)
            
            # Größe-Bias (größere Objekte sind wichtiger)
            obj_area = np.count_nonzero(mask)
            total_area = height * width
            size_bias = min(1.0, obj_area / (total_area * 0.1))  # Normalisiert auf 10% des Bildes
            
            # Kontrast-Bias
            contrast_bias = self._compute_object_contrast(image, mask)
            
            # Kombiniere alle Biases
            final_score = score * (0.4 + 0.2 * center_bias + 0.2 * size_bias + 0.2 * contrast_bias)
            
            # Füge zur Saliency Map hinzu
            object_saliency += mask.astype(np.float32) * final_score
        
        # Normalisiere
        if object_saliency.max() > 0:
            object_saliency = object_saliency / object_saliency.max()
        
        return object_saliency
    
    def _compute_object_contrast(self, image: np.ndarray, mask: np.ndarray) -> float:
        """Berechnet den Kontrast eines Objekts zum Hintergrund"""
        try:
            # Objekt-Pixel
            obj_pixels = image[mask > 0]
            
            # Hintergrund-Pixel (invertierte Maske)
            bg_mask = 255 - mask
            bg_pixels = image[bg_mask > 0]
            
            if len(obj_pixels) == 0 or len(bg_pixels) == 0:
                return 0.5
            
            # Berechne Durchschnittsfarben
            obj_mean = np.mean(obj_pixels, axis=0)
            bg_mean = np.mean(bg_pixels, axis=0)
            
            # Kontrast als Farbunterschied
            contrast = np.linalg.norm(obj_mean - bg_mean) / 255.0
            
            return min(1.0, contrast)
            
        except Exception as e:
            logger.error(f"Error computing object contrast: {e}")
            return 0.5
    
    def _compute_traditional_saliency(self, image: np.ndarray) -> np.ndarray:
        """Berechnet traditionelle Saliency-Methoden als Backup"""
        try:
            # Edge Detection
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            
            # Color Contrast
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            kernel = np.ones((9, 9), np.float32) / 81
            l_mean = cv2.filter2D(l.astype(np.float32), -1, kernel)
            l_contrast = np.abs(l.astype(np.float32) - l_mean)
            
            # Kombiniere
            traditional_saliency = (
                0.6 * edges.astype(np.float32) +
                0.4 * l_contrast
            )
            
            # Normalisiere
            if traditional_saliency.max() > 0:
                traditional_saliency = traditional_saliency / traditional_saliency.max()
            
            return traditional_saliency
            
        except Exception as e:
            logger.error(f"Error computing traditional saliency: {e}")
            return np.zeros(image.shape[:2], dtype=np.float32)
    
    def _combine_saliency_maps(self, object_saliency: np.ndarray, 
                              traditional_saliency: np.ndarray,
                              height: int, width: int) -> np.ndarray:
        """Kombiniert Objekt-basierte und traditionelle Saliency"""
        
        # Gewichte
        object_weight = 0.7  # Objekte sind wichtiger
        traditional_weight = 0.3
        
        # Kombiniere
        combined = (
            object_weight * object_saliency +
            traditional_weight * traditional_saliency
        )
        
        # Normalisiere auf 0-255
        if combined.max() > 0:
            combined = (combined / combined.max() * 255).astype(np.uint8)
        else:
            combined = combined.astype(np.uint8)
        
        return combined
    
    def _generate_center_saliency_map(self, height: int, width: int) -> np.ndarray:
        """Fallback: Zentrierte Saliency Map"""
        saliency_map = np.zeros((height, width), dtype=np.uint8)
        
        center_x, center_y = width // 2, height // 2
        max_radius = min(width, height) // 3
        
        for y in range(height):
            for x in range(width):
                dx = (x - center_x) / max_radius
                dy = (y - center_y) / max_radius
                distance = np.sqrt(dx*dx + dy*dy)
                
                if distance <= 1.0:
                    saliency_value = int(255 * (1.0 - distance))
                    saliency_map[y, x] = saliency_value
        
        return saliency_map
    
    def get_roi_suggestions(self, saliency_map: np.ndarray, 
                           aspect_ratio: Tuple[int, int] = (9, 16),
                           num_suggestions: int = 3) -> List[Dict[str, Any]]:
        """
        Generiert ROI-Vorschläge basierend auf Saliency Map
        """
        try:
            height, width = saliency_map.shape
            target_w, target_h = aspect_ratio
            
            # ROI-Größe berechnen
            roi_width = min(width, int(width * 0.8))
            roi_height = int(roi_width * target_h / target_w)
            
            if roi_height > height:
                roi_height = min(height, int(height * 0.8))
                roi_width = int(roi_height * target_w / target_h)
            
            rois = []
            
            # Finde Regionen mit hoher Saliency
            for i in range(num_suggestions):
                # Adaptive Thresholds
                if saliency_map.max() > saliency_map.min():
                    threshold = saliency_map.min() + (saliency_map.max() - saliency_map.min()) * (0.5 + i * 0.2)
                else:
                    threshold = saliency_map.max() * 0.5
                
                mask = saliency_map > threshold
                
                if np.any(mask):
                    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    
                    if contours:
                        largest_contour = max(contours, key=cv2.contourArea)
                        x, y, w, h = cv2.boundingRect(largest_contour)
                        
                        center_x = x + w // 2
                        center_y = y + h // 2
                        
                        roi_x = max(0, center_x - roi_width // 2)
                        roi_y = max(0, center_y - roi_height // 2)
                        roi_x = min(roi_x, width - roi_width)
                        roi_y = min(roi_y, height - roi_height)
                        
                        roi_saliency = saliency_map[roi_y:roi_y+roi_height, roi_x:roi_x+roi_width]
                        score = np.mean(roi_saliency) / 255.0
                        
                        roi = {
                            "x": int(roi_x),
                            "y": int(roi_y),
                            "width": int(roi_width),
                            "height": int(roi_height),
                            "score": float(score),
                            "method": "sam_deepgaze_hybrid"
                        }
                        
                        rois.append(roi)
            
            # Fallback: Zentrierte ROI
            if len(rois) == 0:
                center_x = width // 2
                center_y = height // 2
                roi_x = max(0, center_x - roi_width // 2)
                roi_y = max(0, center_y - roi_height // 2)
                
                rois.append({
                    "x": roi_x,
                    "y": roi_y,
                    "width": roi_width,
                    "height": roi_height,
                    "score": 0.5,
                    "method": "fallback_center"
                })
            
            # Nach Score sortieren
            rois.sort(key=lambda r: r["score"], reverse=True)
            return rois[:num_suggestions]
            
        except Exception as e:
            logger.error(f"Error generating ROI suggestions: {e}")
            return [{
                "x": width // 4,
                "y": height // 4,
                "width": width // 2,
                "height": height // 2,
                "score": 0.5,
                "method": "error_fallback"
            }]
