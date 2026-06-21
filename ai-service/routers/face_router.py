"""
routers/face_router.py — All face recognition API endpoints
"""

import time
import logging
import base64
from typing import List, Optional
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
import numpy as np
import cv2

from models.schemas import (
    RecognizeRequest, RecognizeResponse, FaceRecognition,
    RegisterFaceRequest, RegisterFaceResponse, EmbeddingResult,
    QualityCheckRequest, LivenessCheckRequest,
)
from services.face_recognition_service import get_face_recognition_service
from services.detection_services import (
    AntiSpoofingService, EmotionDetectionService,
    MaskDetectionService, FaceQualityService,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Singleton detection services
_anti_spoof = AntiSpoofingService()
_emotion = EmotionDetectionService()
_mask = MaskDetectionService()
_quality = FaceQualityService()


def get_face_db(request: Request):
    return request.app.state.face_db


# ─── POST /api/recognize ─────────────────────────────────────
@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_faces(payload: RecognizeRequest, request: Request):
    """
    Main attendance marking endpoint.
    Accepts base64 image, runs full AI pipeline:
    1. Face detection
    2. Quality check
    3. Anti-spoofing
    4. Face recognition
    5. Emotion detection
    6. Mask detection
    """
    t_start = time.time()
    face_db = get_face_db(request)
    fr_service = get_face_recognition_service()

    # Decode image
    image = fr_service.decode_image(payload.image)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid or unreadable image")

    # Get all known embeddings (optionally filtered by department)
    known = face_db.get_all()
    if not known:
        return RecognizeResponse(
            success=False,
            message="No registered faces in database. Please register students first.",
            processing_time_ms=round((time.time() - t_start) * 1000, 2),
        )

    # Detect all faces
    detected_faces = fr_service.detect_faces(image)
    if not detected_faces:
        return RecognizeResponse(
            success=False,
            message="No faces detected in image",
            total_faces=0,
            processing_time_ms=round((time.time() - t_start) * 1000, 2),
        )

    recognitions: List[FaceRecognition] = []
    unknown_count = 0

    for face in detected_faces:
        bbox = face.get("bbox")
        embedding = face.get("embedding")
        if embedding is None:
            unknown_count += 1
            continue

        # 1. Quality check
        quality_result = _quality.check_quality(image, bbox)
        if not quality_result["is_acceptable"]:
            logger.info(f"Face rejected: poor quality {quality_result['issues']}")
            unknown_count += 1
            continue

        # 2. Anti-spoofing / liveness check
        liveness_result = _anti_spoof.check_liveness(image, bbox)
        if payload.require_liveness and not liveness_result["is_live"]:
            logger.warning(f"Spoof detected! Score: {liveness_result['score']}")
            unknown_count += 1
            continue

        # 3. Identify face against database
        best_sim = 0.0
        best_match = None
        for known_entry in known:
            for emb_vec in known_entry.get("embeddings", []):
                sim, _ = fr_service.compare_embeddings(embedding, [emb_vec])
                if sim > best_sim:
                    best_sim = sim
                    best_match = known_entry

        if not best_match or not fr_service.is_match(best_sim):
            unknown_count += 1
            continue

        # 4. Emotion detection
        emotion_result = _emotion.detect_emotion(image)

        # 5. Mask detection
        mask_result = _mask.detect_mask(image, bbox)

        recognitions.append(FaceRecognition(
            roll_number=best_match["roll_number"],
            name=best_match["name"],
            student_id=best_match["student_id"],
            confidence=round(best_sim, 4),
            bounding_box=bbox,
            is_live=liveness_result["is_live"],
            liveness_score=liveness_result["score"],
            has_mask=mask_result["has_mask"],
            mask_confidence=mask_result["confidence"],
            quality_score=quality_result["score"],
            quality_issues=quality_result["issues"],
            emotion={"dominant": emotion_result["dominant"], "scores": emotion_result["scores"]},
        ))

    return RecognizeResponse(
        success=len(recognitions) > 0,
        message=f"Recognized {len(recognitions)} face(s)",
        recognitions=recognitions,
        unknown_faces=unknown_count,
        total_faces=len(detected_faces),
        liveness_required=payload.require_liveness,
        processing_time_ms=round((time.time() - t_start) * 1000, 2),
    )


# ─── POST /api/register-face ─────────────────────────────────
@router.post("/register-face", response_model=RegisterFaceResponse)
async def register_face(payload: RegisterFaceRequest, request: Request):
    """
    Register face images for a student.
    Generates InsightFace embeddings and stores in face DB.
    """
    fr_service = get_face_recognition_service()
    face_db = get_face_db(request)

    embeddings: List[EmbeddingResult] = []
    failed = 0
    all_vectors = []

    for url in payload.image_urls:
        image = fr_service.load_image_from_url(url)
        if image is None:
            failed += 1
            continue

        result = fr_service.generate_embedding(image)
        if result is None:
            logger.warning(f"No face found in image: {url}")
            failed += 1
            continue

        # Quality gate
        quality = _quality.check_quality(image)
        if quality["score"] < 40:
            logger.warning(f"Poor quality image skipped: {url} — {quality['issues']}")
            failed += 1
            continue

        embeddings.append(EmbeddingResult(
            vector=result["vector"],
            quality=result["quality"],
            image_url=url,
        ))
        all_vectors.append(result["vector"])

    if not embeddings:
        return RegisterFaceResponse(
            success=False,
            message="No valid face embeddings could be generated from the provided images",
            failed=failed,
        )

    # Compute average embedding
    avg_embedding = np.mean(all_vectors, axis=0).tolist()

    # Update in-memory face DB
    face_db.add_or_update(
        roll_number=payload.roll_number,
        student_id=payload.student_id,
        name=payload.roll_number,  # name will be updated when loaded from backend
        embeddings=all_vectors,
    )

    return RegisterFaceResponse(
        success=True,
        message=f"Successfully registered {len(embeddings)} face embeddings",
        embeddings=embeddings,
        average_embedding=avg_embedding,
        total_processed=len(payload.image_urls),
        failed=failed,
    )


# ─── DELETE /api/face/{roll_number} ──────────────────────────
@router.delete("/face/{roll_number}")
async def delete_face(roll_number: str, request: Request):
    face_db = get_face_db(request)
    face_db.remove(roll_number)
    return {"success": True, "message": f"Face data removed for {roll_number}"}


# ─── POST /api/quality-check ─────────────────────────────────
@router.post("/quality-check")
async def quality_check(payload: QualityCheckRequest):
    """Check image quality before registration/attendance"""
    fr_service = get_face_recognition_service()
    image = fr_service.decode_image(payload.image)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    faces = fr_service.detect_faces(image)
    if not faces:
        return {"success": False, "face_detected": False, "message": "No face detected"}

    face = faces[0]
    quality = _quality.check_quality(image, face.get("bbox"))

    return {
        "success": True,
        "face_detected": True,
        "face_count": len(faces),
        "quality": quality,
        "bbox": face.get("bbox"),
    }


# ─── POST /api/liveness-check ────────────────────────────────
@router.post("/liveness-check")
async def liveness_check(payload: LivenessCheckRequest):
    """Standalone liveness/anti-spoofing check"""
    fr_service = get_face_recognition_service()
    image = fr_service.decode_image(payload.image)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    faces = fr_service.detect_faces(image)
    bbox = faces[0].get("bbox") if faces else None
    result = _anti_spoof.check_liveness(image, bbox)

    return {"success": True, **result}


# ─── POST /api/reload-db ─────────────────────────────────────
@router.post("/reload-db")
async def reload_face_db(request: Request):
    """Force reload face embeddings from backend (call after new registrations)"""
    face_db = get_face_db(request)
    await face_db.reload()
    return {"success": True, "message": "Face database reloaded", **face_db.stats()}


# ─── GET /api/db-stats ───────────────────────────────────────
@router.get("/db-stats")
async def db_stats(request: Request):
    face_db = get_face_db(request)
    return {"success": True, **face_db.stats()}
