# 👁️ VisionTrack — Real-Time Object Detection & Tracking

> YOLOv8 + DeepSORT · FastAPI · React · WebSockets

Live object detection from your webcam or uploaded videos, with persistent tracking IDs drawn over each detected object.

---

## ✨ Features

- **Live webcam detection** via WebSocket streaming (~10 fps to backend)
- **Video file upload** — process any MP4/MOV/AVI and download annotated result
- **DeepSORT tracking** — each object gets a persistent ID across frames
- **80 COCO classes** detected out of the box (person, car, dog, phone…)
- Clean dark UI with per-object detection sidebar

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI + Uvicorn |
| Detection | YOLOv8n (Ultralytics) |
| Tracking | DeepSORT Realtime |
| Video | OpenCV |

---

## 🚀 Getting Started

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server (YOLOv8 weights download automatically on first run)
uvicorn main:app --reload --port 8000
```

Backend runs at → `http://localhost:8000`  
API docs at → `http://localhost:8000/docs`

---

### 2. Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend runs at → `http://localhost:5173`

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Check backend status |
| `POST` | `/detect/video` | Upload video, get annotated MP4 |
| `WS` | `/ws/webcam` | Real-time frame detection |

### WebSocket Protocol

**Client → Server:** Base64-encoded JPEG frame (string)

**Server → Client:**
```json
{
  "frame": "<base64 annotated JPEG>",
  "detections": [
    { "id": 1, "label": "person", "confidence": 0.91, "bbox": [120, 45, 380, 520] }
  ]
}
```

---

## 🧠 How It Works

```
Webcam → Base64 JPEG → WebSocket → FastAPI
  → YOLOv8 (detect objects + confidence)
  → DeepSORT (assign/maintain tracking IDs)
  → Draw bounding boxes + labels
  → Base64 JPEG → WebSocket → React Canvas
```

---

## 📁 Project Structure

```
visiontrack/
├── backend/
│   ├── main.py          # FastAPI routes (REST + WebSocket)
│   ├── detector.py      # YOLOv8 + DeepSORT wrapper
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── WebcamFeed.jsx   # Live WebSocket stream
            └── VideoUpload.jsx  # File upload + progress
```

---

## 🚢 Deployment

**Backend → Render**
- Add `uvicorn main:app --host 0.0.0.0 --port $PORT` as start command
- Set `PYTHON_VERSION = 3.11`

**Frontend → Vercel**
- Update `WS_URL` and `API_URL` in components to point to Render URL
- `npm run build` → deploy `dist/` folder

---

## 📸 Demo

> Record a short GIF of the webcam detecting people/objects and add it here — this is your portfolio's best asset!

---

## 📄 License

MIT
