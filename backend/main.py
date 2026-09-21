import os
import sys
import base64
import json
import numpy as np
import cv2
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from PIL import Image
import io

from emotion_model import EmotionDetector
from analytics import SessionAnalytics

app = FastAPI(title="AI Facial Emotion Detection API", version="1.0.0")

# Enable CORS for cross-origin frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = EmotionDetector()
session_analytics = SessionAnalytics()

# Determine paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "Facial Emotion Detection AI/ML",
        "supported_emotions": detector.EMOTIONS
    }

@app.get("/api/analytics")
async def get_analytics():
    return session_analytics.get_summary()

@app.post("/api/analytics/reset")
async def reset_analytics():
    global session_analytics
    session_analytics = SessionAnalytics()
    return {"message": "Session analytics reset successfully"}

@app.post("/api/detect")
async def detect_image(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file, detects faces and emotions.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame_bgr is None:
            return JSONResponse(status_code=400, content={"error": "Invalid image data"})

        faces = detector.detect_emotions(frame_bgr)
        session_analytics.record_frame(faces)
        summary = session_analytics.get_summary()

        return {
            "success": True,
            "faces_detected": len(faces),
            "faces": faces,
            "session_summary": summary
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """
    High-speed WebSocket stream for real-time webcam frame processing.
    """
    await websocket.accept()
    print("[WebSocket] Client connected to live emotion stream.")

    try:
        while True:
            # Receive frame data (text base64 or JSON message)
            data = await websocket.receive_text()
            if not data:
                continue

            # Strip possible data URI header
            if "," in data:
                _, b64_data = data.split(",", 1)
            else:
                b64_data = data

            # Decode base64 to numpy array
            img_bytes = base64.b64decode(b64_data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame_bgr is None:
                await websocket.send_json({"error": "Failed to decode frame"})
                continue

            # Detect emotions
            faces = detector.detect_emotions(frame_bgr)
            
            # Record analytics
            frame_entry = session_analytics.record_frame(faces)
            summary = session_analytics.get_summary()

            # Response packet
            response = {
                "faces": faces,
                "frame_entry": frame_entry,
                "summary": summary
            }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected.")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
        try:
            await websocket.close()
        except:
            pass

# Mount frontend directory at root so /css/styles.css, /js/app.js, and / resolve seamlessly
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
