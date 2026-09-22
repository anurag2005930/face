Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   SYNAPSE BIOMETRIC AI - FACE & HAND MOTION DETECTION SYSTEM" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "[ERROR] Python is not installed or not in your PATH." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[INFO] Starting Python server at http://localhost:8000..." -ForegroundColor Green
Start-Process "http://localhost:8000"
python server.py
