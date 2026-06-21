"""
Face Database Service
Manages in-memory cache of face embeddings for fast recognition.
Syncs from MongoDB via backend API on startup and on demand.
"""

import numpy as np
import logging
import httpx
import os
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
BACKEND_API_KEY = os.getenv("AI_SERVICE_SECRET", "ai-service-secret")


class FaceDatabase:
    """In-memory face embedding database with hot-reload support"""

    def __init__(self):
        # {roll_number: {"student_id", "name", "roll_number", "embeddings": [[512-dim], ...]}}
        self._db: Dict[str, Dict[str, Any]] = {}
        self.total_faces = 0

    async def initialize(self):
        """Load all face embeddings from the backend on startup"""
        await self.reload()

    async def reload(self):
        """Fetch all embeddings from backend MongoDB"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{BACKEND_URL}/api/students/face-embeddings/all",
                    headers={"x-ai-service-key": BACKEND_API_KEY},
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    self._db = {}
                    for entry in data:
                        roll = entry.get("roll_number")
                        if roll and entry.get("embeddings"):
                            self._db[roll] = {
                                "student_id": entry["student_id"],
                                "name": entry["name"],
                                "roll_number": roll,
                                "embeddings": [e["vector"] for e in entry["embeddings"] if e.get("vector")],
                            }
                    self.total_faces = len(self._db)
                    logger.info(f"Face DB reloaded: {self.total_faces} students")
                else:
                    logger.warning(f"Backend returned {resp.status_code} during face DB reload")
        except Exception as e:
            logger.warning(f"Could not load face DB from backend: {e}. Starting empty.")
            self._db = {}
            self.total_faces = 0

    def add_or_update(self, roll_number: str, student_id: str, name: str, embeddings: List[List[float]]):
        """Add or update embeddings for a student"""
        self._db[roll_number] = {
            "student_id": student_id,
            "name": name,
            "roll_number": roll_number,
            "embeddings": embeddings,
        }
        self.total_faces = len(self._db)
        logger.info(f"Face DB updated: {roll_number} ({len(embeddings)} embeddings)")

    def remove(self, roll_number: str):
        """Remove a student's face data"""
        if roll_number in self._db:
            del self._db[roll_number]
            self.total_faces = len(self._db)
            logger.info(f"Face DB removed: {roll_number}")

    def get_all(self) -> List[Dict[str, Any]]:
        """Return all entries as a list"""
        return list(self._db.values())

    def get_by_department(self, department_id: str) -> List[Dict[str, Any]]:
        """Filter by department (if dept stored in db entry)"""
        return [v for v in self._db.values() if v.get("department_id") == department_id]

    def get(self, roll_number: str) -> Optional[Dict[str, Any]]:
        return self._db.get(roll_number)

    def stats(self) -> Dict[str, Any]:
        total_embeddings = sum(len(v["embeddings"]) for v in self._db.values())
        return {
            "total_students": self.total_faces,
            "total_embeddings": total_embeddings,
            "avg_embeddings_per_student": round(total_embeddings / max(1, self.total_faces), 1),
        }
