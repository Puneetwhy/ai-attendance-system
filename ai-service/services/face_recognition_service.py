"""
Face Recognition Service
Uses InsightFace for embedding generation and face matching.
Falls back gracefully if GPU/CUDA is unavailable.
"""

import numpy as np
import cv2
import base64
import logging
import time
from typing import List, Optional, Tuple, Dict, Any
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)

# InsightFace import with graceful fallback
try:
    import insightface
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
    logger.info("InsightFace loaded successfully")
except ImportError:
    INSIGHTFACE_AVAILABLE = False
    logger.warning("InsightFace not available — falling back to face_recognition library")

# face_recognition fallback
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    logger.info("face_recognition library available as fallback")
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    logger.warning("face_recognition not available")


class FaceRecognitionService:
    """Handles face detection, embedding generation, and recognition"""

    SIMILARITY_THRESHOLD = 0.45  # cosine distance threshold (InsightFace)
    FR_TOLERANCE = 0.5            # face_recognition fallback tolerance

    def __init__(self):
        self.model = None
        self._initialize_model()

    def _initialize_model(self):
        if INSIGHTFACE_AVAILABLE:
            try:
                self.model = FaceAnalysis(
                    name="buffalo_l",
                    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
                )
                self.model.prepare(ctx_id=0, det_size=(640, 640))
                self.backend = "insightface"
                logger.info("InsightFace model ready (buffalo_l)")
            except Exception as e:
                logger.error(f"InsightFace init error: {e}")
                self.model = None
                self.backend = "face_recognition" if FACE_RECOGNITION_AVAILABLE else "none"
        elif FACE_RECOGNITION_AVAILABLE:
            self.backend = "face_recognition"
        else:
            self.backend = "none"
            logger.error("No face recognition backend available!")

    @staticmethod
    def decode_image(image_data: str) -> Optional[np.ndarray]:
        """Decode base64 or URL image to numpy array (BGR)"""
        try:
            if image_data.startswith("data:image"):
                image_data = image_data.split(",", 1)[1]

            img_bytes = base64.b64decode(image_data)
            img = Image.open(BytesIO(img_bytes)).convert("RGB")
            return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"Image decode error: {e}")
            return None

    @staticmethod
    def load_image_from_url(url: str) -> Optional[np.ndarray]:
        """Load image from URL"""
        import requests
        try:
            resp = requests.get(url, timeout=10)
            img = Image.open(BytesIO(resp.content)).convert("RGB")
            return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"URL image load error ({url}): {e}")
            return None

    def generate_embedding(self, image: np.ndarray) -> Optional[Dict[str, Any]]:
        """Generate face embedding from image"""
        if self.backend == "insightface" and self.model:
            return self._insightface_embedding(image)
        elif self.backend == "face_recognition":
            return self._fr_embedding(image)
        return None

    def _insightface_embedding(self, image: np.ndarray) -> Optional[Dict[str, Any]]:
        try:
            faces = self.model.get(image)
            if not faces:
                return None
            # Use the largest/most confident face
            face = max(faces, key=lambda f: f.det_score)
            return {
                "vector": face.embedding.tolist(),
                "quality": float(face.det_score),
                "bbox": face.bbox.astype(int).tolist(),
            }
        except Exception as e:
            logger.error(f"InsightFace embedding error: {e}")
            return None

    def _fr_embedding(self, image: np.ndarray) -> Optional[Dict[str, Any]]:
        try:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            locations = face_recognition.face_locations(rgb, model="hog")
            if not locations:
                return None
            encodings = face_recognition.face_encodings(rgb, locations)
            if not encodings:
                return None
            return {"vector": encodings[0].tolist(), "quality": 0.9, "bbox": list(locations[0])}
        except Exception as e:
            logger.error(f"face_recognition embedding error: {e}")
            return None

    def detect_faces(self, image: np.ndarray) -> List[Dict]:
        """Detect all faces in an image"""
        if self.backend == "insightface" and self.model:
            try:
                faces = self.model.get(image)
                return [{
                    "bbox": f.bbox.astype(int).tolist(),
                    "confidence": float(f.det_score),
                    "embedding": f.embedding.tolist() if hasattr(f, "embedding") else None,
                    "kps": f.kps.astype(int).tolist() if hasattr(f, "kps") else None,
                } for f in faces]
            except Exception as e:
                logger.error(f"Face detection error: {e}")
                return []
        elif self.backend == "face_recognition":
            try:
                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                locs = face_recognition.face_locations(rgb, model="hog")
                encs = face_recognition.face_encodings(rgb, locs)
                return [{"bbox": list(loc), "confidence": 0.9, "embedding": enc.tolist()} for loc, enc in zip(locs, encs)]
            except Exception as e:
                logger.error(f"face_recognition detection error: {e}")
                return []
        return []

    def compare_embeddings(
        self,
        probe: List[float],
        gallery: List[List[float]],
    ) -> Tuple[float, int]:
        """
        Compare probe embedding against gallery.
        Returns (best_similarity, best_index).
        Uses cosine similarity for InsightFace, euclidean for face_recognition.
        """
        if not gallery:
            return 0.0, -1

        probe_np = np.array(probe)
        gallery_np = np.array(gallery)

        if self.backend == "insightface":
            # Cosine similarity
            probe_norm = probe_np / (np.linalg.norm(probe_np) + 1e-6)
            gallery_norms = gallery_np / (np.linalg.norm(gallery_np, axis=1, keepdims=True) + 1e-6)
            similarities = np.dot(gallery_norms, probe_norm)
            best_idx = int(np.argmax(similarities))
            return float(similarities[best_idx]), best_idx
        else:
            # Euclidean distance → convert to similarity
            distances = np.linalg.norm(gallery_np - probe_np, axis=1)
            best_idx = int(np.argmin(distances))
            similarity = max(0.0, 1.0 - float(distances[best_idx]) / self.FR_TOLERANCE)
            return similarity, best_idx

    def is_match(self, similarity: float) -> bool:
        if self.backend == "insightface":
            return similarity >= (1 - self.SIMILARITY_THRESHOLD)
        return similarity >= 0.5

    def recognize_in_image(
        self,
        image: np.ndarray,
        known_embeddings: List[Dict],  # [{"roll_number", "name", "student_id", "embeddings": [[...]...]}]
    ) -> List[Dict]:
        """
        Recognize all faces in an image against the known embeddings database.
        Returns list of recognition results.
        """
        faces = self.detect_faces(image)
        results = []

        for face in faces:
            if face.get("embedding") is None:
                results.append({"recognized": False, "bbox": face["bbox"]})
                continue

            best_sim = 0.0
            best_match = None

            for known in known_embeddings:
                # Compare against all embeddings for this student
                for emb_vector in known.get("embeddings", []):
                    sim, _ = self.compare_embeddings(face["embedding"], [emb_vector])
                    if sim > best_sim:
                        best_sim = sim
                        best_match = known

            if best_match and self.is_match(best_sim):
                results.append({
                    "recognized": True,
                    "roll_number": best_match["roll_number"],
                    "name": best_match["name"],
                    "student_id": best_match["student_id"],
                    "confidence": best_sim,
                    "bbox": face["bbox"],
                    "embedding": face["embedding"],
                })
            else:
                results.append({
                    "recognized": False,
                    "confidence": best_sim,
                    "bbox": face["bbox"],
                })

        return results


# Singleton instance
_face_recognition_service: Optional[FaceRecognitionService] = None

def get_face_recognition_service() -> FaceRecognitionService:
    global _face_recognition_service
    if _face_recognition_service is None:
        _face_recognition_service = FaceRecognitionService()
    return _face_recognition_service
