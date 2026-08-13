@echo off
setlocal

cd /d "%~dp0"

echo === Push Update to GitHub ===
echo.

echo Pulling latest from GitHub first...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo ERROR: git pull failed. Fix conflicts before pushing.
    pause
    exit /b 1
)

echo.
git add .
git commit -m "update %date% %time%"
git push

echo.
echo Done! Check github.com/tereh36/PPT_lego_generator to confirm.
pause
