@echo off
title EasyHire Onboarding Portal
cd /d "%~dp0"
echo ===================================================
echo   EasyHire - Onboarding Portal Server Starting...
echo ===================================================
echo Open your browser at: http://localhost:5000
echo.
node server/index.js
pause
