"""
AI Smart Attendance System — FastAPI Microservice
Handles: Face Recognition, Anti-Spoofing, Emotion Detection, Mask Detection, Face Quality
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import time
from contextlib import asynccontextmanager

from routers import face_router, health_router
from services.face_db import FaceDatabase

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ── Startup / Shutdown ────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting AI Service...")
    # Initialize face database (loads all embeddings into memory for fast lookup)
    app.state.face_db = FaceDatabase()
    await app.state.face_db.initialize()
    logger.info(f"✅ Face database loaded: {app.state.face_db.total_faces} registered faces")
    yield
    logger.info("🛑 Shutting down AI Service...")

# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="AI Attendance System - AI Service",
    description="Face recognition, emotion detection, anti-spoofing microservice",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request timing middleware ─────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time-Ms"] = str(round((time.time() - start) * 1000, 2))
    return response

# ── Routers ───────────────────────────────────────────────────
app.include_router(health_router.router, prefix="/api", tags=["Health"])
app.include_router(face_router.router, prefix="/api", tags=["Face Recognition"])

# ── Root ──────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "AI Attendance Service", "status": "running", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, workers=1)
