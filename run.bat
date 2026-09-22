@echo off
title Synapse Biometric AI - Face & Hand Detection
echo ================================================================
echo    SYNAPSE BIOMETRIC AI - FACE & HAND MOTION DETECTION SYSTEM
echo ================================================================
echo.
echo [1/2] Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not found in PATH! Please install Python.
    pause
    exit /b 1
)

echo [2/2] Launching Biometric AI Server on http://localhost:8000 ...
start "" http://localhost:8000
python server.py
pause
