# 🎓 AI Smart Attendance Management System

A production-ready, full-stack attendance management system powered by AI Face Recognition, built with the MERN stack and Python FastAPI microservice.

## ✨ Features

| Module | Features |
|--------|----------|
| 🔐 Auth | JWT, RBAC, Refresh Tokens, Password Reset |
| 👤 Face Recognition | Real-time webcam, multi-face detection, InsightFace embeddings |
| 🛡️ Anti-Spoofing | Liveness detection, spoof prevention |
| 😊 Emotion Detection | DeepFace emotion analysis stored with attendance |
| 😷 Mask Detection | Real-time mask presence detection |
| 📍 Geo-Fencing | GPS-based location validation |
| ⏰ Time Restrictions | Configurable attendance windows |
| 🏖️ Leave Management | Apply, approve, reject with document upload |
| 📧 Notifications | Email (Nodemailer) + WhatsApp alerts |
| 📊 Analytics | Attendance trends, department stats, AI insights |
| 🤖 AI Chatbot | OpenAI-powered assistant for queries |
| 📄 Reports | PDF, Excel, CSV export |
| 🌙 Dark Mode | Full dark/light theme support |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                │
│              Vercel · Tailwind CSS · Recharts            │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────┐
│               Node.js / Express Backend                  │
│          Render · JWT · Multer · Nodemailer              │
└──────────┬────────────────────────────┬─────────────────┘
           │ Mongoose                   │ HTTP
┌──────────▼──────────┐   ┌────────────▼────────────────┐
│    MongoDB Atlas     │   │   Python FastAPI AI Service  │
│    (Database)        │   │   InsightFace · DeepFace     │
└─────────────────────┘   │   OpenCV · Anti-Spoofing     │
                          └─────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account
- Cloudinary account

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/ai-attendance-system.git
cd ai-attendance-system

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# AI Service
cd ../ai-service && pip install -r requirements.txt
```

### 2. Environment Setup

Copy `.env.example` files in each directory and fill in your values.

### 3. Run Development

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - AI Service
cd ai-service && uvicorn main:app --reload --port 8000
```

## 📁 Project Structure

```
ai-attendance-system/
├── backend/               # Node.js/Express API
│   ├── config/           # DB, Cloudinary, JWT config
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Auth, upload, validation
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   └── utils/            # Helpers
├── frontend/             # React/Vite app
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route pages
│       ├── hooks/        # Custom hooks
│       ├── context/      # React context
│       └── services/     # API calls
├── ai-service/           # Python FastAPI microservice
│   ├── routers/          # API endpoints
│   ├── services/         # AI/ML logic
│   └── models/           # Pydantic schemas
└── docs/                 # Documentation
```

## 🔑 Default Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.edu | Admin@123 |
| Teacher | teacher@school.edu | Teacher@123 |
| Student | student@school.edu | Student@123 |

## 📦 Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for full production deployment guide.

## 🐳 Docker

```bash
docker-compose up --build
```

## 📝 License

MIT License
