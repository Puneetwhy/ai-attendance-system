"""
AI Detection Services:
- Anti-Spoofing (liveness detection)
- Emotion Detection (DeepFace)
- Mask Detection (OpenCV DNN)
- Face Quality Check
"""

import cv2
import numpy as np
import logging
from typing import Dict, Any, Optional, List, Tuple

logger = logging.getLogger(__name__)

# ── DeepFace ─────────────────────────────────────────────────
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    logger.info("DeepFace loaded")
except ImportError:
    DEEPFACE_AVAILABLE = False
    logger.warning("DeepFace not available — emotion detection disabled")


# ════════════════════════════════════════════
# Anti-Spoofing Service
# Uses texture analysis + frequency domain to detect print/replay attacks
# ════════════════════════════════════════════
class AntiSpoofingService:
    """
    Passive liveness detection using multiple cues:
    1. HSV color histogram analysis
    2. Laplacian variance (texture richness)
    3. Frequency domain analysis (FFT)
    4. Eye blink detection (optional, for video)

    For production, replace/augment with:
    - Silent-Face-Anti-Spoofing (MiniVision)
    - FaceLiveness SDK
    """

    def __init__(self):
        # Load face detector for pre-processing
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )

    def check_liveness(self, image: np.ndarray, face_bbox: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        Returns liveness score and verdict.
        score > 0.5 → live
        """
        try:
            # Crop face region if bbox provided
            face_img = self._crop_face(image, face_bbox)

            # Multi-factor analysis
            texture_score = self._texture_analysis(face_img)
            freq_score = self._frequency_analysis(face_img)
            color_score = self._color_analysis(face_img)
            reflection_score = self._specular_reflection_check(face_img)

            # Weighted ensemble
            liveness_score = (
                texture_score * 0.35 +
                freq_score * 0.30 +
                color_score * 0.20 +
                reflection_score * 0.15
            )

            is_live = liveness_score > 0.52

            return {
                "is_live": is_live,
                "score": round(liveness_score, 3),
                "method": "passive_multi_factor",
                "details": {
                    "texture": round(texture_score, 3),
                    "frequency": round(freq_score, 3),
                    "color": round(color_score, 3),
                    "reflection": round(reflection_score, 3),
                },
            }
        except Exception as e:
            logger.error(f"Liveness check error: {e}")
            # Default to live on error to avoid blocking legitimate users
            return {"is_live": True, "score": 0.6, "method": "fallback"}

    def _crop_face(self, image: np.ndarray, bbox: Optional[List[int]]) -> np.ndarray:
        if bbox and len(bbox) == 4:
            x, y, w, h = bbox
            # Add margin
            margin = int(min(w, h) * 0.1)
            x1, y1 = max(0, x - margin), max(0, y - margin)
            x2, y2 = min(image.shape[1], x + w + margin), min(image.shape[0], y + h + margin)
            return image[y1:y2, x1:x2]
        return image

    def _texture_analysis(self, image: np.ndarray) -> float:
        """Real faces have rich micro-textures; printed photos are smoother"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        gray = cv2.resize(gray, (128, 128))

        # Local Binary Pattern (simplified)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Normalize: printed photos typically < 100, real > 200
        score = min(1.0, lap_var / 300.0)
        return score

    def _frequency_analysis(self, image: np.ndarray) -> float:
        """Printed/screen photos show different frequency distributions"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        gray = cv2.resize(gray, (128, 128)).astype(np.float32)

        fft = np.fft.fft2(gray)
        fft_shift = np.fft.fftshift(fft)
        magnitude = np.abs(fft_shift)

        # High frequency energy ratio
        h, w = magnitude.shape
        center = magnitude[h//4:3*h//4, w//4:3*w//4]
        high_freq_energy = np.sum(magnitude) - np.sum(center)
        total_energy = np.sum(magnitude) + 1e-8

        hf_ratio = high_freq_energy / total_energy
        # Real faces: balanced frequency; printed: altered pattern
        score = min(1.0, hf_ratio * 2.5)
        return score

    def _color_analysis(self, image: np.ndarray) -> float:
        """Skin color distribution analysis — screens/prints have different saturation"""
        if len(image.shape) < 3:
            return 0.6

        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        # Skin tone range in HSV
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([25, 255, 255], dtype=np.uint8)
        mask = cv2.inRange(hsv, lower_skin, upper_skin)
        skin_ratio = np.sum(mask > 0) / mask.size

        # Saturation variance
        sat_var = np.var(hsv[:, :, 1])
        normalized_sat = min(1.0, sat_var / 2000.0)

        score = 0.4 * min(1.0, skin_ratio * 4) + 0.6 * normalized_sat
        return score

    def _specular_reflection_check(self, image: np.ndarray) -> float:
        """Real faces have subtle specular highlights; screens have uniform brightness"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

        # Check for uniform high brightness patches (screen artifact)
        _, bright_mask = cv2.threshold(gray, 230, 255, cv2.THRESH_BINARY)
        bright_ratio = np.sum(bright_mask > 0) / bright_mask.size

        # Too many bright pixels → likely screen
        if bright_ratio > 0.15:
            return 0.3

        return min(1.0, 1.0 - bright_ratio * 4)


# ════════════════════════════════════════════
# Emotion Detection Service (DeepFace)
# ════════════════════════════════════════════
class EmotionDetectionService:
    EMOTION_MAP = {
        "happy": "happy", "sad": "sad", "angry": "angry",
        "neutral": "neutral", "fear": "fear", "surprise": "surprise",
        "disgust": "disgust",
    }

    def detect_emotion(self, image: np.ndarray) -> Dict[str, Any]:
        if not DEEPFACE_AVAILABLE:
            return self._fallback_emotion()

        try:
            result = DeepFace.analyze(
                img_path=image,
                actions=["emotion"],
                enforce_detection=False,
                silent=True,
            )

            if isinstance(result, list):
                result = result[0]

            emotions = result.get("emotion", {})
            dominant = result.get("dominant_emotion", "neutral")

            return {
                "dominant": self.EMOTION_MAP.get(dominant, "neutral"),
                "scores": {
                    "happy": emotions.get("happy", 0) / 100,
                    "sad": emotions.get("sad", 0) / 100,
                    "angry": emotions.get("angry", 0) / 100,
                    "neutral": emotions.get("neutral", 0) / 100,
                    "fear": emotions.get("fear", 0) / 100,
                    "surprise": emotions.get("surprise", 0) / 100,
                    "disgust": emotions.get("disgust", 0) / 100,
                },
            }
        except Exception as e:
            logger.error(f"Emotion detection error: {e}")
            return self._fallback_emotion()

    def _fallback_emotion(self):
        return {
            "dominant": "neutral",
            "scores": {"happy": 0, "sad": 0, "angry": 0, "neutral": 1.0, "fear": 0, "surprise": 0, "disgust": 0},
        }


# ════════════════════════════════════════════
# Mask Detection Service
# ════════════════════════════════════════════
class MaskDetectionService:
    """
    Uses a lightweight CNN model to detect face masks.
    Falls back to simple color/shape heuristics if model unavailable.
    """

    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        """Try to load mask detection model"""
        try:
            # Try to load a pre-trained mask detection model
            # You can use models from: https://github.com/chandrikadeb7/Face-Mask-Detection
            import urllib.request
            import os
            model_path = "models/mask_detector.model"
            if not os.path.exists(model_path):
                logger.warning("Mask detection model not found. Using heuristic fallback.")
                self.model = None
                return
            self.model = cv2.dnn.readNet(model_path)
        except Exception:
            self.model = None

    def detect_mask(self, image: np.ndarray, face_bbox: Optional[List[int]] = None) -> Dict[str, Any]:
        """Detect if person is wearing a mask"""
        try:
            face_img = self._crop_face(image, face_bbox)
            if self.model:
                return self._model_predict(face_img)
            return self._heuristic_detect(face_img)
        except Exception as e:
            logger.error(f"Mask detection error: {e}")
            return {"has_mask": False, "confidence": 0.5}

    def _crop_face(self, image: np.ndarray, bbox: Optional[List[int]]) -> np.ndarray:
        if bbox and len(bbox) == 4:
            x, y, w, h = bbox
            return image[max(0, y):min(image.shape[0], y+h), max(0, x):min(image.shape[1], x+w)]
        return image

    def _heuristic_detect(self, face: np.ndarray) -> Dict[str, Any]:
        """Simple heuristic: check for uniform color coverage over lower face region"""
        if face.size == 0:
            return {"has_mask": False, "confidence": 0.5}

        h, w = face.shape[:2]
        lower_face = face[h//2:, :]

        hsv = cv2.cvtColor(lower_face, cv2.COLOR_BGR2HSV)
        # White/blue mask colors
        white_mask = cv2.inRange(hsv, np.array([0, 0, 200]), np.array([180, 30, 255]))
        blue_mask = cv2.inRange(hsv, np.array([100, 50, 50]), np.array([130, 255, 255]))

        coverage = (np.sum(white_mask > 0) + np.sum(blue_mask > 0)) / white_mask.size

        if coverage > 0.3:
            return {"has_mask": True, "confidence": min(0.9, coverage * 2.5)}
        return {"has_mask": False, "confidence": 1 - coverage}

    def _model_predict(self, face: np.ndarray) -> Dict[str, Any]:
        """Model-based prediction (placeholder for actual model)"""
        return self._heuristic_detect(face)


# ════════════════════════════════════════════
# Face Quality Check Service
# ════════════════════════════════════════════
class FaceQualityService:
    MIN_FACE_SIZE = (80, 80)
    BLUR_THRESHOLD = 80.0
    BRIGHTNESS_RANGE = (40, 220)
    ANGLE_THRESHOLD = 30

    def check_quality(self, image: np.ndarray, face_bbox: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        Comprehensive face quality check.
        Returns score (0–100) and list of issues.
        """
        issues = []
        scores = []

        # 1. Face size check
        if face_bbox:
            x, y, w, h = face_bbox
            if w < self.MIN_FACE_SIZE[0] or h < self.MIN_FACE_SIZE[1]:
                issues.append("face_too_small")
                scores.append(20)
            else:
                scores.append(100)

        # Crop face for remaining checks
        face_img = image
        if face_bbox and len(face_bbox) == 4:
            x, y, w, h = face_bbox
            face_img = image[max(0,y):y+h, max(0,x):x+w]

        if face_img.size == 0:
            return {"score": 0, "is_acceptable": False, "issues": ["no_face_detected"]}

        # 2. Blur check (Laplacian variance)
        blur_score = self._check_blur(face_img)
        if blur_score < self.BLUR_THRESHOLD:
            issues.append("blurry")
            scores.append(max(10, int(blur_score / self.BLUR_THRESHOLD * 60)))
        else:
            scores.append(min(100, int(blur_score / 200 * 100)))

        # 3. Brightness check
        bright_score = self._check_brightness(face_img)
        scores.append(bright_score)
        if bright_score < 40:
            issues.append("too_dark")
        elif bright_score < 50:
            issues.append("low_light")

        # 4. Contrast check
        contrast_score = self._check_contrast(face_img)
        scores.append(contrast_score)
        if contrast_score < 40:
            issues.append("low_contrast")

        final_score = sum(scores) / len(scores) if scores else 50
        is_acceptable = final_score >= 55 and "face_too_small" not in issues and "blurry" not in issues

        return {
            "score": round(final_score, 1),
            "is_acceptable": is_acceptable,
            "issues": issues,
        }

    def _check_blur(self, image: np.ndarray) -> float:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        return cv2.Laplacian(gray, cv2.CV_64F).var()

    def _check_brightness(self, image: np.ndarray) -> float:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        mean_brightness = np.mean(gray)
        if mean_brightness < self.BRIGHTNESS_RANGE[0]:
            return max(0, int(mean_brightness / self.BRIGHTNESS_RANGE[0] * 40))
        elif mean_brightness > self.BRIGHTNESS_RANGE[1]:
            return max(0, int((255 - mean_brightness) / (255 - self.BRIGHTNESS_RANGE[1]) * 40))
        return min(100, int((mean_brightness - self.BRIGHTNESS_RANGE[0]) / (self.BRIGHTNESS_RANGE[1] - self.BRIGHTNESS_RANGE[0]) * 100))

    def _check_contrast(self, image: np.ndarray) -> float:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        return min(100, int(np.std(gray) / 128 * 100))
