#!/usr/bin/env python3
"""
Robuste Saliency Detection - Funktioniert auch mit schwarzen Frames
Kombiniert Edge Detection, Color Contrast, Face Detection und Center Bias
"""

import cv2
import numpy as np
from typing import Tuple, List, Dict, Any
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class RobustSaliencyDetector:
    """
    Robuste Saliency Detection die auch mit schwarzen Frames umgehen kann
    """
    
    def __init__(self):
        """Initialisiert den robusten Saliency Detector"""
        self.face_cascade = self._load_face_detector()
        
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
        Generiert eine robuste Saliency Map
        
        Args:
            image: Input-Bild (BGR)
            
        Returns:
            Saliency Map (0-255)
        """
        try:
            height, width = image.shape[:2]
            
            # Prüfe ob Frame zu dunkel ist
            brightness = np.mean(image)
            is_dark_frame = brightness < 30  # Sehr dunkel
            
            if is_dark_frame:
                logger.debug(f"Dark frame detected (brightness: {brightness:.1f}), using center bias")
                return self._generate_center_saliency_map(height, width)
            
            # 1. Edge-based Saliency
            edge_saliency = self._compute_edge_saliency(image)
            
            # 2. Color Contrast Saliency
            color_saliency = self._compute_color_contrast_saliency(image)
            
            # 3. Face Detection Saliency
            face_saliency = self._compute_face_saliency(image)
            
            # 4. Center Bias
            center_saliency = self._compute_center_bias(height, width)
            
            # 5. Kombiniere alle Saliency-Maps gewichtet
            weights = self._calculate_weights(edge_saliency, color_saliency, face_saliency)
            
            # Normalisiere alle Maps auf 0-1
            edge_norm = self._normalize_saliency(edge_saliency)
            color_norm = self._normalize_saliency(color_saliency)
            face_norm = self._normalize_saliency(face_saliency)
            center_norm = self._normalize_saliency(center_saliency)
            
            # Gewichtete Kombination
            combined_saliency = (
                weights['edge'] * edge_norm +
                weights['color'] * color_norm +
                weights['face'] * face_norm +
                weights['center'] * center_norm
            )
            
            # Normalisiere auf 0-255
            saliency_map = (combined_saliency * 255).astype(np.uint8)
            
            logger.debug(f"Generated robust saliency map: {saliency_map.shape}, "
                        f"min={saliency_map.min()}, max={saliency_map.max()}, "
                        f"non-zero={np.count_nonzero(saliency_map)}")
            
            return saliency_map
            
        except Exception as e:
            logger.error(f"Error generating saliency map: {e}")
            return self._generate_center_saliency_map(image.shape[0], image.shape[1])
    
    def _compute_edge_saliency(self, image: np.ndarray) -> np.ndarray:
        """Berechnet Edge-basierte Saliency"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Adaptive Canny-Parameter basierend auf Bildhelligkeit
            brightness = np.mean(gray)
            if brightness < 50:
                low_threshold = 30
                high_threshold = 80
            elif brightness < 100:
                low_threshold = 50
                high_threshold = 150
            else:
                low_threshold = 50
                high_threshold = 150
            
            edges = cv2.Canny(gray, low_threshold, high_threshold)
            
            # Erweitere Kanten für bessere Saliency
            kernel = np.ones((3, 3), np.uint8)
            edges_dilated = cv2.dilate(edges, kernel, iterations=1)
            
            return edges_dilated.astype(np.float32)
            
        except Exception as e:
            logger.error(f"Error computing edge saliency: {e}")
            return np.zeros(image.shape[:2], dtype=np.float32)
    
    def _compute_color_contrast_saliency(self, image: np.ndarray) -> np.ndarray:
        """Berechnet Color Contrast Saliency"""
        try:
            # Konvertiere zu LAB für bessere Color-Perception
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Berechne lokalen Kontrast mit größerem Kernel für robustere Ergebnisse
            kernel_size = 15
            kernel = np.ones((kernel_size, kernel_size), np.float32) / (kernel_size * kernel_size)
            
            l_mean = cv2.filter2D(l.astype(np.float32), -1, kernel)
            a_mean = cv2.filter2D(a.astype(np.float32), -1, kernel)
            b_mean = cv2.filter2D(b.astype(np.float32), -1, kernel)
            
            # Kontrast = Abweichung vom lokalen Mittelwert
            l_contrast = np.abs(l.astype(np.float32) - l_mean)
            a_contrast = np.abs(a.astype(np.float32) - a_mean)
            b_contrast = np.abs(b.astype(np.float32) - b_mean)
            
            # Kombiniere Kontraste
            color_saliency = (l_contrast + a_contrast + b_contrast) / 3
            
            return color_saliency
            
        except Exception as e:
            logger.error(f"Error computing color contrast saliency: {e}")
            return np.zeros(image.shape[:2], dtype=np.float32)
    
    def _compute_face_saliency(self, image: np.ndarray) -> np.ndarray:
        """Berechnet Face-basierte Saliency"""
        try:
            height, width = image.shape[:2]
            face_saliency = np.zeros((height, width), dtype=np.float32)
            
            if self.face_cascade is None:
                return face_saliency
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Erkenne Gesichter mit verschiedenen Parametern
            faces = self.face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=3,  # Weniger restriktiv
                minSize=(20, 20)  # Kleinere Mindestgröße
            )
            
            # Erstelle Saliency Map für Gesichter
            for (x, y, w, h) in faces:
                center_x, center_y = x + w//2, y + h//2
                radius_x, radius_y = int(w//2 * 1.5), int(h//2 * 1.5)
                
                # Erstelle elliptische Saliency um das Gesicht
                for py in range(max(0, center_y - radius_y), min(height, center_y + radius_y)):
                    for px in range(max(0, center_x - radius_x), min(width, center_x + radius_x)):
                        dx = (px - center_x) / radius_x
                        dy = (py - center_y) / radius_y
                        distance = np.sqrt(dx*dx + dy*dy)
                        
                        if distance <= 1.0:
                            saliency_value = 1.0 - distance
                            face_saliency[py, px] = max(face_saliency[py, px], saliency_value)
            
            logger.debug(f"Detected {len(faces)} faces")
            return face_saliency
            
        except Exception as e:
            logger.error(f"Error computing face saliency: {e}")
            return np.zeros(image.shape[:2], dtype=np.float32)
    
    def _compute_center_bias(self, height: int, width: int) -> np.ndarray:
        """Berechnet Center Bias Saliency"""
        center_saliency = np.zeros((height, width), dtype=np.float32)
        
        center_x, center_y = width // 2, height // 2
        max_radius = min(width, height) // 3
        
        for y in range(height):
            for x in range(width):
                dx = (x - center_x) / max_radius
                dy = (y - center_y) / max_radius
                distance = np.sqrt(dx*dx + dy*dy)
                
                if distance <= 1.0:
                    center_saliency[y, x] = 1.0 - distance
        
        return center_saliency
    
    def _calculate_weights(self, edge_saliency: np.ndarray, color_saliency: np.ndarray, 
                          face_saliency: np.ndarray) -> Dict[str, float]:
        """Berechnet adaptive Gewichte basierend auf der Qualität der Saliency-Maps"""
        
        # Basis-Gewichte
        weights = {
            'edge': 0.3,
            'color': 0.3,
            'face': 0.3,
            'center': 0.1
        }
        
        # Passe Gewichte basierend auf der Qualität an
        edge_quality = np.count_nonzero(edge_saliency) / edge_saliency.size
        color_quality = np.count_nonzero(color_saliency) / color_saliency.size
        face_quality = np.count_nonzero(face_saliency) / face_saliency.size
        
        # Wenn eine Komponente sehr schwach ist, erhöhe andere
        if edge_quality < 0.01:  # Weniger als 1% Kanten
            weights['edge'] = 0.1
            weights['color'] += 0.1
            weights['face'] += 0.1
        
        if color_quality < 0.01:  # Weniger als 1% Kontrast
            weights['color'] = 0.1
            weights['edge'] += 0.1
            weights['face'] += 0.1
        
        if face_quality < 0.001:  # Weniger als 0.1% Gesicht
            weights['face'] = 0.1
            weights['edge'] += 0.1
            weights['color'] += 0.1
        
        # Normalisiere Gewichte
        total_weight = sum(weights.values())
        for key in weights:
            weights[key] /= total_weight
        
        return weights
    
    def _normalize_saliency(self, saliency: np.ndarray) -> np.ndarray:
        """Normalisiert Saliency Map auf 0-1"""
        if saliency.max() > 0:
            return saliency / saliency.max()
        return saliency
    
    def _generate_center_saliency_map(self, height: int, width: int) -> np.ndarray:
        """Fallback: Zentrierte Saliency Map"""
        return self._compute_center_bias(height, width) * 255
    
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
            
            # Methode 1: Höchste Saliency-Regionen finden
            for i in range(num_suggestions):
                # Adaptive Thresholds
                if saliency_map.max() > saliency_map.min():
                    threshold = saliency_map.min() + (saliency_map.max() - saliency_map.min()) * (0.4 + i * 0.2)
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
                            "method": "robust_saliency"
                        }
                        
                        rois.append(roi)
            
            # Methode 2: Sliding Window für zusätzliche Vorschläge
            if len(rois) < num_suggestions:
                step_size = min(roi_width // 4, roi_height // 4, 50)
                
                for y in range(0, height - roi_height + 1, step_size):
                    for x in range(0, width - roi_width + 1, step_size):
                        if len(rois) >= num_suggestions:
                            break
                            
                        roi_saliency = saliency_map[y:y+roi_height, x:x+roi_width]
                        score = np.mean(roi_saliency) / 255.0
                        
                        # Niedrigere Mindest-Score für bessere Ergebnisse
                        if score > 0.1:
                            roi = {
                                "x": int(x),
                                "y": int(y),
                                "width": int(roi_width),
                                "height": int(roi_height),
                                "score": float(score),
                                "method": "sliding_window"
                            }
                            rois.append(roi)
                    
                    if len(rois) >= num_suggestions:
                        break
            
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
