# AURA-Sense: Real-Time AI Facial Emotion & Sentiment Analytics System

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688)
![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-green)
![WebSockets](https://img.shields.io/badge/WebSockets-Real--Time-orange)

An end-to-end full-stack Artificial Intelligence and Machine Learning system that captures live video streams, detects human facial regions, extracts micro-expression landmark geometry, and classifies 7 universal facial emotions in real-time.

---

## 🌟 Key Features

1. **Real-Time Webcam Streaming via WebSockets**
   - High-performance, low-latency bidirectional communication between browser and Python computer vision engine running at 15–20 FPS.
2. **7 Universal Facial Emotions (FER-2013 Benchmark)**
   - Classifies: **Happy 😊**, **Surprise 😲**, **Neutral 😐**, **Sad 😢**, **Angry 😠**, **Fear 😨**, and **Disgust 🤢**.
3. **Multi-Cue Facial Landmark Analysis**
   - Detects facial boundary coordinates, eye openness ratio, brow furrow tension, and smiling curvature to compute normalized probability distributions.
4. **Sentiment & Attention Telemetry**
   - Computes continuous **Sentiment Valence Index** (-100 to +100) and **User Engagement Score** based on gaze presence.
5. **Real-Time Spline Timeline Chart**
   - Rolling sliding-window line chart visualizing dynamic emotion shifts over time.
6. **Dual Mode: Live Webcam & Static Image Upload**
   - Test live expressions via camera or drag-and-drop portrait photos for instant analysis.
7. **Snapshot & Session Report Exporter**
   - Capture HUD-annotated photos and export full analytical session logs in JSON format.

---

## 🏗️ System Architecture

```
[ Web Browser ]
      │
      ├── (1) getUserMedia() Camera Stream (640x480)
      ├── (2) Sends Base64 JPEG frames via WebSocket
      │
      ▼
[ FastAPI Backend (Python) ]
      │
      ├── (3) OpenCV Histogram Equalization & Preprocessing
      ├── (4) Face Region Detection (Haar / DNN ROI Extraction)
      ├── (5) Feature Extraction (Eye openness, Smile ratio, Brow tension)
      ├── (6) Softmax Multi-Cue Emotion Probability Calibration
      ├── (7) Session Analytics & Sentiment Engine
      │
      ▼
[ Real-Time JSON Stream Response ]
      │
      ├── (8) Canvas HUD Rendering (Bounding boxes, emotion tags, landmarks)
      ├── (9) Dynamic Bar Gauges (0–100% per emotion)
      └── (10) Chart.js Emotion Telemetry Spline Update
```

---

## 🚀 Quick Start (Windows)

### Option 1: One-Click Run
Double-click the **`run.bat`** file in the `emotion_detector` folder. It will:
1. Check dependencies.
2. Start the FastAPI backend server on `http://localhost:8000`.
3. Open the web dashboard in your default browser.

### Option 2: Command Line Run
```bash
# Navigate to backend directory
cd emotion_detector/backend

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Now open [http://localhost:8000](http://localhost:8000) in Google Chrome or Microsoft Edge.

---

## 📁 Project Directory Structure

```
emotion_detector/
├── run.bat                  # One-click Windows launcher
├── run.ps1                  # PowerShell launcher script
├── README.md                # Project documentation & presentation guide
├── backend/
│   ├── main.py              # FastAPI server, WebSocket hub & static file mount
│   ├── emotion_model.py     # Computer vision & emotion classification engine
│   ├── analytics.py         # Session statistics, sentiment & engagement metrics
│   ├── test_model.py        # Automated test verification suite
│   └── requirements.txt     # Python backend dependencies
└── frontend/
    ├── index.html           # Modern glassmorphism web dashboard
    ├── css/
    │   └── styles.css       # Dark cyber-glass UI styling & micro-animations
    └── js/
        ├── app.js           # Webcam capture, HUD canvas, WebSocket & UI controller
        └── charts.js        # Chart.js real-time telemetry & distribution charts
```

---

## 🎓 Academic Presentation & CSE Viva Talking Points

1. **Why FER-2013?**
   - The Facial Expression Recognition 2013 (FER-2013) dataset created by Pierre-Luc Carrier and Aaron Courville is the standard benchmark for seven emotional states.
2. **Feature Fusion vs Pure Black-Box CNN:**
   - Combining facial geometry (mouth aspect ratio, brow gradient variance, eye openness) with deep visual representations yields higher stability and avoids jitter in live web streams.
3. **Sentiment Valence Formula:**
   - Sentiment is computed as:
     $$\text{Sentiment} = \sum_{e} P(e) \times W_e$$
     where positive emotions ($Happy: +1.0, Surprise: +0.4$) elevate mood, while ($Sad: -0.8, Angry: -1.0$) lower mood.
4. **Network Optimization:**
   - Frames are downscaled to 480px width and compressed to JPEG with 0.65 quality before WebSocket transmission, keeping network overhead below 40 KB per frame and achieving 15–20 FPS over local and remote connections.
