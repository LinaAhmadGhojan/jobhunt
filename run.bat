@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ===== Job hunt: collecting fresh remote jobs for Lina =====
echo  (put the latest CV as cv\cv.docx, edit profile.json to change keywords / countries)
echo.
node collect.mjs --days 30
if errorlevel 1 (
  echo  Something failed - check your internet connection and try again.
  pause
  exit /b 1
)
start "" "%~dp0site\index.html"
