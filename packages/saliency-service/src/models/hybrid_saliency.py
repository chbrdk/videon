#!/usr/bin/env python3
"""
Hybrid Saliency Detection - Kombiniert mehrere moderne Methoden
für bessere Saliency Detection ohne SAM
"""

import cv2
import numpy as np
from typing import Tuple, List, Dict, Any
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class HybridSaliencyDetector:
    """
    Moderne Saliency Detection ohne SAM
    Kombiniert Edge Detection, Color Contrast, Face Detection und Motion
    """
    
    def __init__(self):
        """Initialisiert den Hybrid Saliency Detector"""
        self.face_cascade = None
        self._load_face_detector()
        
    def _load_face_detector(self):
        """Lädt OpenCV Face Detector"""
        try:
            # Versuche verschiedene Face Cascade Pfade
            cascade_paths = [
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml',
                '/usr/local/share/opencv4/haarcascades/haarcascade_frontalface_default.xml',
                '/opt/homebrew/share/opencv4/haarcascades/haarcascade_frontalface_default.xml'
            ]
            
            for path in cascade_paths:
                if Path(path).exists():
                    self.face_cascade = cv2.CascadeClassifier(path)
                    logger.info(f"Face detector loaded from: {path}")
                    break
            
            if self.face_cascade is None:
                logger.warning("Face detector not available - face detection disabled")
                
        except Exception as e:
            logger.warning(f"Could not load face detector: {e}")
            self.face_cascade = None
    
    def generate_saliency_map(self, image: np.ndarray) -> np.ndarray:
        """
        Generiert eine Saliency Map mit hybriden Methoden
        
        Args:
            image: Input-Bild (BGR)
            
        Returns:
            Saliency Map (0-255)
        """
        try:
            height, width = image.shape[:2]
            
            # 1. Edge-based Saliency
            edge_saliency = self._compute_edge_saliency(image)
            
            # 2. Color Contrast Saliency
            color_saliency = self._compute_color_contrast_saliency(image)
            
            # 3. Face Detection Saliency
            face_saliency = self._compute_face_saliency(image)
            
            # 4. Center Bias (Menschen schauen oft ins Zentrum)
            center_saliency = self._compute_center_bias(height, width)
            
            # 5. Kombiniere alle Saliency-Maps gewichtet
            weights = {
                'edge': 0.3,
                'color': 0.3,
                'face': 0.3,
                'center': 0.1
            }
            
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
            
            logger.debug(f"Generated hybrid saliency map: {saliency_map.shape}, "
                        f"min={saliency_map.min()}, max={saliency_map.max()}")
            
            return saliency_map
            
        except Exception as e:
            logger.error(f"Error generating saliency map: {e}")
            # Fallback: Zentrierte Saliency Map
            return self._generate_center_saliency_map(image.shape[0], image.shape[1])
    
    def _compute_edge_saliency(self, image: np.ndarray) -> np.ndarray:
        """Berechnet Edge-basierte Saliency"""
        try:
            # Konvertiere zu Graustufen
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Verschiedene Edge-Detection Methoden
            edges_canny = cv2.Canny(gray, 50, 150)
            edges_sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            edges_sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            edges_sobel = np.sqrt(edges_sobel_x**2 + edges_sobel_y**2)
            
            # Kombiniere Edge-Detection Methoden
            edge_saliency = (
                0.5 * edges_canny.astype(np.float32) +
                0.5 * np.abs(edges_sobel).astype(np.float32)
            )
            
            # Normalisiere
            if edge_saliency.max() > 0:
                edge_saliency = edge_saliency / edge_saliency.max()
            
            return edge_saliency
            
        except Exception as e:
            logger.error(f"Error computing edge saliency: {e}")
            return np.zeros(image.shape[:2], dtype=np.float32)
    
    def _compute_color_contrast_saliency(self, image: np.ndarray) -> np.ndarray:
        """Berechnet Color Contrast Saliency"""
        try:
            # Konvertiere zu LAB für bessere Color-Perception
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Berechne lokalen Kontrast
            kernel = np.ones((9, 9), np.float32) / 81
            l_mean = cv2.filter2D(l.astype(np.float32), -1, kernel)
            a_mean = cv2.filter2D(a.astype(np.float32), -1, kernel)
            b_mean = cv2.filter2D(b.astype(np.float32), -1, kernel)
            
            # Kontrast = Abweichung vom lokalen Mittelwert
            l_contrast = np.abs(l.astype(np.float32) - l_mean)
            a_contrast = np.abs(a.astype(np.float32) - a_mean)
            b_contrast = np.abs(b.astype(np.float32) - b_mean)
            
            # Kombiniere Kontraste
            color_saliency = (l_contrast + a_contrast + b_contrast) / 3
            
            # Normalisiere
            if color_saliency.max() > 0:
                color_saliency = color_saliency / color_saliency.max()
            
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
            
            # Konvertiere zu Graustufen für Face Detection
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Erkenne Gesichter
            faces = self.face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(30, 30)
            )
            
            # Erstelle Saliency Map für Gesichter
            for (x, y, w, h) in faces:
                # Erstelle elliptische Saliency um das Gesicht
                center_x, center_y = x + w//2, y + h//2
                radius_x, radius_y = w//2, h//2
                
                # Erweitere den Radius für bessere Saliency
                radius_x = int(radius_x * 1.5)
                radius_y = int(radius_y * 1.5)
                
                # Erstelle elliptische Maske
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
        
        Args:
            saliency_map: 2D Saliency Map
            aspect_ratio: Ziel-Seitenverhältnis (width, height)
            num_suggestions: Anzahl der ROI-Vorschläge
            
        Returns:
            Liste von ROI-Dictionaries
        """
        try:
            height, width = saliency_map.shape
            target_w, target_h = aspect_ratio
            
            # ROI-Größe basierend auf Aspect Ratio berechnen
            roi_width = min(width, int(width * 0.8))  # Max 80% der Breite
            roi_height = int(roi_width * target_h / target_w)
            
            if roi_height > height:
                roi_height = min(height, int(height * 0.8))
                roi_width = int(roi_height * target_w / target_h)
            
            # Saliency-basierte ROI-Suche
            rois = []
            
            # Methode 1: Höchste Saliency-Regionen finden
            for i in range(num_suggestions):
                # Dynamische Thresholds basierend auf Saliency-Verteilung
                if saliency_map.max() > saliency_map.min():
                    # Verwende adaptive Thresholds
                    threshold = saliency_map.min() + (saliency_map.max() - saliency_map.min()) * (0.6 + i * 0.15)
                else:
                    # Fallback für einheitliche Maps
                    threshold = saliency_map.max() * 0.5
                
                # Regionen mit hoher Saliency finden
                mask = saliency_map > threshold
                
                if np.any(mask):
                    # Konturen finden
                    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    
                    if contours:
                        # Größte Kontur verwenden
                        largest_contour = max(contours, key=cv2.contourArea)
                        x, y, w, h = cv2.boundingRect(largest_contour)
                        
                        # ROI auf Ziel-Größe anpassen
                        center_x = x + w // 2
                        center_y = y + h // 2
                        
                        roi_x = max(0, center_x - roi_width // 2)
                        roi_y = max(0, center_y - roi_height // 2)
                        roi_x = min(roi_x, width - roi_width)
                        roi_y = min(roi_y, height - roi_height)
                        
                        # Saliency-Score für diese ROI berechnen
                        roi_saliency = saliency_map[roi_y:roi_y+roi_height, roi_x:roi_x+roi_width]
                        score = np.mean(roi_saliency) / 255.0
                        
                        roi = {
                            "x": int(roi_x),
                            "y": int(roi_y),
                            "width": int(roi_width),
                            "height": int(roi_height),
                            "score": float(score),
                            "method": "hybrid_saliency"
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
                        
                        # Nur hinzufügen wenn Score hoch genug
                        if score > 0.2:  # Niedrigere Mindest-Score für bessere Ergebnisse
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
            
            # Nach Score sortieren und beste auswählen
            rois.sort(key=lambda r: r["score"], reverse=True)
            rois = rois[:num_suggestions]
            
            logger.debug(f"Generated {len(rois)} ROI suggestions")
            return rois
            
        except Exception as e:
            logger.error(f"Error generating ROI suggestions: {e}")
            # Fallback: Zentrierte ROI
            center_x = width // 2
            center_y = height // 2
            roi_width = min(width, int(width * 0.8))
            roi_height = int(roi_width * target_h / target_w)
            
            return [{
                "x": max(0, center_x - roi_width // 2),
                "y": max(0, center_y - roi_height // 2),
                "width": roi_width,
                "height": roi_height,
                "score": 0.5,
                "method": "fallback_center"
            }]
