Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AURA-SENSE: Real-Time AI Facial Emotion Detection System  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path (Join-Path $ScriptDir "backend")

Write-Host "Starting Python FastAPI & Computer Vision Engine..." -ForegroundColor Yellow
Write-Host "Opening Dashboard at http://localhost:8000..." -ForegroundColor Green

Start-Job -ScriptBlock { Start-Sleep -Seconds 2; Start-Process "http://localhost:8000" } | Out-Null
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
