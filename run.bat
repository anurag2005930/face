@echo off
title AURA-Sense Facial Emotion Detection System
echo ============================================================
echo   AURA-SENSE: Real-Time AI Facial Emotion Detection System
echo ============================================================
echo.
cd /d "%~dp0backend"

echo Checking Python dependencies...
python -m pip install -r requirements.txt --quiet

echo.
echo [1/2] Starting Python FastAPI & Computer Vision Engine...
echo [2/2] Opening Dashboard in default browser: http://localhost:8000
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
