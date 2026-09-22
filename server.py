import os
import sys
import json
import base64
import time
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
SNAPSHOTS_DIR = BASE_DIR / "snapshots"
SNAPSHOTS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Biometric AI - Face Emotion & Hand Motion Detection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "service": "Biometric Face & Hand Engine"
    }

@app.post("/api/save-snapshot")
async def save_snapshot(request: Request):
    try:
        data = await request.json()
        image_data = data.get("image", "")
        telemetry = data.get("telemetry", {})
        
        if not image_data or not image_data.startswith("data:image"):
            return JSONResponse(status_code=400, content={"error": "Invalid image payload"})
            
        header, encoded = image_data.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"capture_{timestamp_str}.png"
        filepath = SNAPSHOTS_DIR / filename
        
        with open(filepath, "wb") as f:
            f.write(image_bytes)
            
        json_filename = f"capture_{timestamp_str}_telemetry.json"
        with open(SNAPSHOTS_DIR / json_filename, "w", encoding="utf-8") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "file": filename,
                "telemetry": telemetry
            }, f, indent=2)
            
        return {
            "success": True,
            "filename": filename,
            "path": str(filepath)
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# Mount current directory to serve static assets (css, js, html)
app.mount("/static", StaticFiles(directory=str(BASE_DIR)), name="static")

@app.get("/")
async def root():
    index_path = BASE_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return HTMLResponse("<h1>Index file not found</h1>", status_code=404)

@app.get("/{full_path:path}")
async def serve_file(full_path: str):
    file_path = BASE_DIR / full_path
    if file_path.is_file():
        return FileResponse(file_path)
    index_path = BASE_DIR / "index.html"
    return FileResponse(index_path)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"==================================================")
    print(f"   BIOMETRIC AI FACE & HAND DETECTION SYSTEM")
    print(f"   Running on: http://localhost:{port}")
    print(f"==================================================")
    uvicorn.run("server.py:app" if len(sys.argv) > 1 and sys.argv[1] == "--reload" else app, host="0.0.0.0", port=port)
