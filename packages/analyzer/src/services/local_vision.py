import logging
import cv2
import numpy as np
import os
import time
from typing import List, Dict, Any, Optional, Tuple

# Import ML libraries
# Wrap in try-except to allow graceful degradation/mocking if libs are missing during build
try:
    from ultralytics import YOLO
    import mediapipe as mp
    import easyocr
    ML_AVAILABLE = True
except ImportError as e:
    logging.warning(f"ML libraries not found: {e}. Vision features will be disabled.")
    ML_AVAILABLE = False

logger = logging.getLogger(__name__)

class LocalVisionBackend:
    """
    Local Vision Analysis Backend
    Implements object detection, face detection, text recognition, and pose estimation
    using Python-native libraries (YOLO, MediaPipe, EasyOCR).
    """
    
    _instance = None
    _models_loaded = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LocalVisionBackend, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance
    
    def initialize(self):
        """Initialize all ML models"""
        if not ML_AVAILABLE:
            return
            
        if self._models_loaded:
            return
            
        logger.info("Initializing Local Vision Models...")
        
        try:
            # 1. YOLOv8 for Object Detection (small, fast model)
            # Weights will auto-download to ~/.config/Ultralytics/ or current dir
            self.yolo_model = YOLO("yolov8n.pt") 
            
            # 2. MediaPipe for Face Detection
            self.mp_face_detection = mp.solutions.face_detection
            self.face_detector = self.mp_face_detection.FaceDetection(
                min_detection_confidence=0.5
            )
            
            # 3. MediaPipe for Pose Estimation
            self.mp_pose = mp.solutions.pose
            self.pose_detector = self.mp_pose.Pose(
                static_image_mode=True,
                model_complexity=1,
                min_detection_confidence=0.5
            )
            
            # 4. EasyOCR for Text Recognition
            # 'en' defaults, gpu=False by default for broader compatibility, enable if CUDA available
            # Note: EasyOCR model download happens on first init
            self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            
            self._models_loaded = True
            logger.info("✅ Local Vision Models initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize local vision models: {e}")
            self._models_loaded = False

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Run comprehensive analysis on an image.
        Returns data format compatible with the existing Vision Service API.
        """
        if not ML_AVAILABLE or not self._models_loaded:
            logger.warning("Simulating vision analysis (ML libraries missing)")
            return self._get_empty_result()
            
        start_time = time.time()
        
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            logger.error(f"Could not load image: {image_path}")
            return self._get_empty_result()
            
        # Convert to RGB (OpenCV uses BGR)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        height, width, _ = img.shape
        
        # 1. Object Detection (YOLO)
        objects = self._detect_objects(img)
        
        # 2. Face Detection (MediaPipe)
        faces = self._detect_faces(img_rgb, width, height)
        
        # 3. Text Recognition (EasyOCR)
        text_regions = self._recognize_text(img)
        
        # 4. Pose Estimation (MediaPipe)
        poses = self._detect_poses(img_rgb, width, height)
        
        processing_time = time.time() - start_time
        
        return {
            "objects": objects,
            "faces": faces,
            "textRecognitions": text_regions,
            "humanRectangles": [obj for obj in objects if obj['label'] == 'person'],
            "humanBodyPoses": poses,
            "processingTime": processing_time,
            "visionVersion": "Local-Python-1.0",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    def _detect_objects(self, img) -> List[Dict[str, Any]]:
        results = []
        try:
            # Run inference
            yolo_results = self.yolo_model(img, verbose=False)
            
            for r in yolo_results:
                boxes = r.boxes
                for box in boxes:
                    # Bounding Box
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    w, h = x2 - x1, y2 - y1
                    
                    # Confidence & Class
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    label = self.yolo_model.names[cls]
                    
                    # Normalize coordinates (0-1) - mimicking Vision Framework
                    # Vision Framework often uses bottom-left origin, but we'll stick to top-left standard
                    # API expects normalized [x, y, w, h]
                    img_h, img_w, _ = img.shape
                    norm_x = x1 / img_w
                    norm_y = y1 / img_h
                    norm_w = w / img_w
                    norm_h = h / img_h
                    
                    results.append({
                        "label": label,
                        "confidence": conf,
                        "boundingBox": [norm_x, norm_y, norm_w, norm_h]
                    })
        except Exception as e:
            logger.error(f"YOLO detection failed: {e}")
            
        return results

    def _detect_faces(self, img_rgb, width, height) -> List[Dict[str, Any]]:
        results = []
        try:
            detection_results = self.face_detector.process(img_rgb)
            
            if detection_results.detections:
                for detection in detection_results.detections:
                    bboxC = detection.location_data.relative_bounding_box
                    score = detection.score[0]
                    
                    results.append({
                        "confidence": score,
                        "boundingBox": [bboxC.xmin, bboxC.ymin, bboxC.width, bboxC.height],
                        "landmarks": None # Landmarks extraction if needed
                    })
        except Exception as e:
            logger.error(f"Face detection failed: {e}")
        return results

    def _recognize_text(self, img) -> List[Dict[str, Any]]:
        results = []
        try:
            # EasyOCR returns list of (bbox, text, prob)
            ocr_results = self.reader.readtext(img)
            
            img_h, img_w, _ = img.shape
            
            for (bbox, text, prob) in ocr_results:
                if prob < 0.3: continue
                
                # bbox is list of 4 points [[x,y], [x,y], [x,y], [x,y]]
                # Extract simplified bounding box
                xs = [p[0] for p in bbox]
                ys = [p[1] for p in bbox]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                
                norm_x = min_x / img_w
                norm_y = min_y / img_h
                norm_w = (max_x - min_x) / img_w
                norm_h = (max_y - min_y) / img_h
                
                results.append({
                    "text": text,
                    "confidence": float(prob),
                    "boundingBox": [norm_x, norm_y, norm_w, norm_h]
                })
        except Exception as e:
            logger.error(f"OCR failed: {e}")
        return results

    def _detect_poses(self, img_rgb, width, height) -> List[Dict[str, Any]]:
        results = []
        try:
            pose_results = self.pose_detector.process(img_rgb)
            
            if pose_results.pose_landmarks:
                landmarks = []
                # 33 landmarks defined by MediaPipe Pose
                for lm in pose_results.pose_landmarks.landmark:
                    landmarks.append({
                        "x": lm.x,
                        "y": lm.y,
                        "confidence": lm.visibility
                    })
                
                # Calculate rough bounding box from landmarks
                xs = [lm['x'] for lm in landmarks]
                ys = [lm['y'] for lm in landmarks]
                
                results.append({
                    "keypoints": landmarks,
                    "confidence": 1.0, # Overall confidence hard to get from single pose object
                    "boundingBox": [min(xs), min(ys), max(xs)-min(xs), max(ys)-min(ys)]
                })
        except Exception as e:
            logger.error(f"Pose detection failed: {e}")
        return results

    def _get_empty_result(self):
        return {
            "objects": [],
            "faces": [],
            "textRecognitions": [],
            "humanRectangles": [],
            "humanBodyPoses": [],
            "processingTime": 0.0,
            "visionVersion": "Local-Python-Fallback"
        }
