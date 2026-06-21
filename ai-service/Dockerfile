FROM python:3.11-slim

WORKDIR /app

# System dependencies for OpenCV, dlib, etc.
RUN apt-get update && apt-get install -y \
    build-essential cmake git \
    libglib2.0-0 libsm6 libxext6 libxrender-dev \
    libgl1-mesa-glx libgtk2.0-dev \
    libboost-all-dev \
    wget curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p models face_data logs

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
