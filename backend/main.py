import cv2
import base64
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile
import os
import asyncio
from detector import ObjectDetector

app = FastAPI(title="VisionTrack API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = ObjectDetector()


# ── REST: Video file upload ──────────────────────────────────────────────────

@app.post("/detect/video")
async def detect_video(file: UploadFile = File(...)):
    """Accept a video file, run detection+tracking, return annotated video."""

    # Save uploaded file to a temp location
    suffix = os.path.splitext(file.filename)[-1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        tmp_in.write(await file.read())
        input_path = tmp_in.name

    output_path = input_path.replace(suffix, "_tracked" + suffix)

    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        annotated = detector.annotate_frame(frame)
        out.write(annotated)

    cap.release()
    out.release()
    os.unlink(input_path)

    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename="tracked_output.mp4",
    )


# ── WebSocket: Webcam real-time stream ──────────────────────────────────────

@app.websocket("/ws/webcam")
async def webcam_ws(websocket: WebSocket):
    """
    Client sends base64-encoded JPEG frames.
    Server replies with annotated base64 JPEG + detection metadata.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()

            # Decode incoming base64 frame
            if "," in data:          # strip data-URL prefix if present
                data = data.split(",")[1]
            img_bytes = base64.b64decode(data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                await websocket.send_json({"error": "Could not decode frame"})
                continue

            annotated, meta = detector.process_and_annotate(frame)

            # Encode annotated frame back to base64 JPEG
            _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            encoded = base64.b64encode(buf).decode("utf-8")

            await websocket.send_json({
                "frame": encoded,
                "detections": meta,      # list of {id, label, confidence, bbox}
            })

    except WebSocketDisconnect:
        print("Client disconnected")


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": detector.model_name}
