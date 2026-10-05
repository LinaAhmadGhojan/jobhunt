@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ===== Job hunt: collecting fresh remote jobs for Lina =====
echo  (latest CV: cv\cv.docx  -  keywords/countries: profile.json)
echo.
node collect.mjs --days 30
if errorlevel 1 (
  echo  Something failed - check your internet connection and try again.
  pause
  exit /b 1
)
rem  local server = your Saved / Applied jobs are stored in data\state.json (never reset)
start "JobHunt server" /min cmd /c "node server.mjs"
timeout /t 2 /nobreak >nul
start "" "http://localhost:4600"
