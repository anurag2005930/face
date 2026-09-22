# ⚡ Synapse Biometric AI: Face Emotion & Hand Motion Detection System

A cutting-edge, real-time computer vision and biometric telemetry system running at **60 FPS** in your browser with zero latency. Built with **Google MediaPipe**, **FastAPI**, and vanilla Web technologies (HTML5 Canvas, WebGL, Web Audio API).

---

## 🌟 Key Features

### 1. 🎭 Real-Time Facial Emotion Intelligence
- **468-Point 3D Face Mesh**: Tracks complete facial geometry and micro-expressions in real-time.
- **7 Core Emotion Classifications**:
  - 😄 **Joy / Happy** (Mouth corner elevation, smiling width, cheek lift)
  - 😲 **Surprise** (Oral aperture, eyebrow elevation, eye widening)
  - 😐 **Neutral** (Resting biometric equilibrium)
  - 😔 **Sadness** (Corner depression, inner brow elevation, outer brow droop)
  - 😠 **Anger** (Corrugator brow furrowing, mouth tension)
  - 😨 **Fear / Awe** (Eye aspect ratio enlargement, elevated brow tension)
  - 🤢 **Disgust** (Upper lip lift, nose wrinkle, brow lowering)
- **Exponential Moving Average (EMA) Smoothing**: Eliminates jitter and provides natural, fluid emotion transitions.
- **Micro-Expression Metrics**: Live percentage gauges for Smile Elevation, Brow Furrow, Eye Openness (EAR), and Oral Aperture.
- **Valence Halo**: Dynamic glowing color aura surrounding the detected face that shifts in real time according to emotional valence.

### 2. 🖐️ Hand Motion & Gesture Recognition
- **21-Joint 3D Hand Tracking**: Single and dual hand support with accurate joint-by-joint skeletal rendering.
- **Instant Gesture Recognition**:
  - ✌️ **Peace / Victory**
  - ✋ **Open Palm**
  - ✊ **Closed Fist**
  - 👍 **Thumbs Up**
  - 👎 **Thumbs Down**
  - ☝️ **Pointing**
  - 🤏 / 👌 **Pinch / OK**
  - 🤘 **Rock On / Horns**
  - 🤙 **Call Me**
- **Dynamic Motion Speedometer**: Calculates instantaneous and smoothed velocity in **pixels per second (px/s)** across 4 speed tiers (*Static, Gentle, Moderate, Rapid Swipe*).
- **Directional Compass Radar**: 8-cardinal orientation tracker displaying movement vector (*North, South, East, West, diagonals*).
- **Luminous Particle Motion Trails**: Glowing neon ribbon trails drawn behind moving hands to visualize motion dynamics.

### 3. 📊 Analytics & Telemetry Dashboard
- **Emotion Timeline Sparkline**: Rolling 60-second graph tracking happiness, surprise, and sadness dynamics over time.
- **Session Intelligence**: Session uptime counter, dominant emotional state, total logged gestures, and peak hand velocity record.
- **Data Export & Snapshot**:
  - **Capture Snapshot**: Downloads high-resolution screenshot with biometric HUD overlay and saves telemetry to `/snapshots`.
  - **Export CSV**: Exports full timestamped emotion history logs to CSV format.
- **Audio Feedback**: Subtle sci-fi synthesized chimes on gesture detection via Web Audio API.

---

## 🚀 Getting Started

### Quick Start (One-Click)

Double-click `run.bat` or run:

```bash
python server.py
```

Then open **`http://localhost:8000`** in Google Chrome, Microsoft Edge, or any modern web browser.

### Requirements
- Python 3.8+ (with `fastapi` and `uvicorn`, already installed)
- Webcam (built-in or USB external)

---

## 🛠️ Controls & Customization
- **Face Mesh Toggle**: Show/hide 3D facial landmark points.
- **Hand Skeleton Toggle**: Show/hide joint bones and glowing fingertip beacons.
- **Motion Trails Toggle**: Toggle neon velocity particle trails.
- **Biometric Box Toggle**: Toggle futuristic HUD targeting frame and dominant emotion tag.
- **Mirror View**: Flip camera orientation.
- **Audio Chimes**: Toggle Web Audio synth feedback.
