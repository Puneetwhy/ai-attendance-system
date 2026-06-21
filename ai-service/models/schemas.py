"""Pydantic schemas for AI service request/response models"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class EmotionEnum(str, Enum):
    happy = "happy"
    sad = "sad"
    angry = "angry"
    neutral = "neutral"
    fear = "fear"
    surprise = "surprise"
    disgust = "disgust"
    unknown = "unknown"


class RecognizeRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image")
    department_id: Optional[str] = None
    require_liveness: bool = True


class RegisterFaceRequest(BaseModel):
    student_id: str
    roll_number: str
    image_urls: List[str] = Field(..., min_items=1, max_items=15)


class EmotionScores(BaseModel):
    happy: float = 0.0
    sad: float = 0.0
    angry: float = 0.0
    neutral: float = 0.0
    fear: float = 0.0
    surprise: float = 0.0
    disgust: float = 0.0


class EmotionResult(BaseModel):
    dominant: EmotionEnum = EmotionEnum.unknown
    scores: EmotionScores = EmotionScores()


class MaskResult(BaseModel):
    has_mask: bool = False
    confidence: float = 0.0


class QualityResult(BaseModel):
    score: float = 0.0  # 0–100
    is_acceptable: bool = True
    issues: List[str] = []


class LivenessResult(BaseModel):
    is_live: bool = True
    score: float = 1.0
    method: str = "passive"


class FaceRecognition(BaseModel):
    roll_number: str
    name: str
    student_id: str
    confidence: float
    bounding_box: Optional[List[int]] = None  # [x, y, w, h]
    emotion: Optional[EmotionResult] = None
    mask: Optional[MaskResult] = None
    quality: Optional[QualityResult] = None
    liveness: Optional[LivenessResult] = None
    is_live: bool = True
    liveness_score: float = 1.0
    has_mask: bool = False
    mask_confidence: float = 0.0
    quality_score: float = 100.0
    quality_issues: List[str] = []


class RecognizeResponse(BaseModel):
    success: bool
    message: str = ""
    recognitions: List[FaceRecognition] = []
    unknown_faces: int = 0
    total_faces: int = 0
    processing_time_ms: float = 0.0
    liveness_required: bool = True


class EmbeddingResult(BaseModel):
    vector: List[float]
    quality: float
    image_url: str


class RegisterFaceResponse(BaseModel):
    success: bool
    message: str = ""
    embeddings: List[EmbeddingResult] = []
    average_embedding: Optional[List[float]] = None
    total_processed: int = 0
    failed: int = 0


class QualityCheckRequest(BaseModel):
    image: str  # base64


class LivenessCheckRequest(BaseModel):
    image: str  # base64
    depth_image: Optional[str] = None
