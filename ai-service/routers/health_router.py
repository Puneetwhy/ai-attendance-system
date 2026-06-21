from fastapi import APIRouter, Request
import psutil, platform, time

router = APIRouter()
START_TIME = time.time()

@router.get("/health")
async def health(request: Request):
    face_db = getattr(request.app.state, "face_db", None)
    return {
        "status": "healthy",
        "uptime_seconds": round(time.time() - START_TIME),
        "registered_faces": face_db.total_faces if face_db else 0,
        "system": {
            "python": platform.python_version(),
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
        },
    }
