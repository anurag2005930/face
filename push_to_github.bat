@echo off
title Push AURA-Sense to GitHub (anurag2005930/face)
echo ============================================================
echo   Pushing to https://github.com/anurag2005930/face.git
echo ============================================================
echo.
cd /d "%~dp0"

echo Current remote:
git remote -v
echo.
echo Pushing commits to GitHub...
echo If a GitHub sign-in window appears, click "Sign in with your browser".
echo.

git push -u origin main

echo.
pause
