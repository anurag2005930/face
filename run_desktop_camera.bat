@echo off
title AURA-Sense Direct Laptop Camera Mode
echo ============================================================
echo   AURA-SENSE: Direct Laptop Camera Emotion Detection (OpenCV)
echo ============================================================
echo.
cd /d "%~dp0backend"

echo Checking Python dependencies...
python -m pip install -r requirements.txt --quiet

echo.
echo Starting direct laptop webcam stream...
echo (Press 'q' or 'ESC' on the camera window to exit, 's' for snapshot)
echo.

python desktop_camera.py

pause
