import os
import sys
import json
import base64
from binascii import Error as Base64Error
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
SNAPSHOTS_DIR = BASE_DIR / "snapshots"
SNAPSHOTS_DIR.mkdir(exist_ok=True)
MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024
MAX_REQUEST_BYTES = 14 * 1024 * 1024
PUBLIC_EXTENSIONS = {".html", ".css", ".js"}

app = FastAPI(title="Biometric AI - Face Emotion & Hand Motion Detection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=False,
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
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BYTES:
            return JSONResponse(status_code=413, content={"error": "Snapshot payload is too large"})

        data = json.loads(await request.body())
        if not isinstance(data, dict):
            return JSONResponse(status_code=400, content={"error": "Invalid snapshot request"})
        image_data = data.get("image", "")
        telemetry = data.get("telemetry", {})

        if not isinstance(image_data, str) or not image_data.startswith("data:image/png;base64,"):
            return JSONResponse(status_code=400, content={"error": "Invalid image payload"})

        _, encoded = image_data.split(",", 1)
        image_bytes = base64.b64decode(encoded, validate=True)
        if len(image_bytes) > MAX_SNAPSHOT_BYTES or not image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return JSONResponse(status_code=400, content={"error": "Invalid or oversized PNG image"})

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"capture_{timestamp_str}_{uuid4().hex[:8]}.png"
        filepath = SNAPSHOTS_DIR / filename
        
        with open(filepath, "wb") as f:
            f.write(image_bytes)
            
        json_filename = f"capture_{timestamp_str}_{uuid4().hex[:8]}_telemetry.json"
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
    except (json.JSONDecodeError, ValueError, TypeError, Base64Error):
        return JSONResponse(status_code=400, content={"error": "Invalid snapshot request"})
    except OSError:
        return JSONResponse(status_code=500, content={"error": "Snapshot could not be saved"})

@app.get("/")
async def root():
    index_path = BASE_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return HTMLResponse("<h1>Index file not found</h1>", status_code=404)

@app.get("/{full_path:path}")
async def serve_file(full_path: str):
    requested_path = (BASE_DIR / full_path).resolve()
    try:
        requested_path.relative_to(BASE_DIR)
    except ValueError:
        return HTMLResponse("<h1>Not found</h1>", status_code=404)

    if requested_path.is_file() and requested_path.suffix.lower() in PUBLIC_EXTENSIONS:
        return FileResponse(requested_path)
    return HTMLResponse("<h1>Not found</h1>", status_code=404)

if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", 8000))
    print(f"==================================================")
    print(f"   BIOMETRIC AI FACE & HAND DETECTION SYSTEM")
    print(f"   Running on: http://localhost:{port}")
    print(f"==================================================")
    uvicorn.run("server.py:app" if len(sys.argv) > 1 and sys.argv[1] == "--reload" else app, host=host, port=port)
