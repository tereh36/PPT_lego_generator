@echo off
setlocal

cd /d "%~dp0"

echo === Push Update to GitHub ===
echo.

git add .
git commit -m "update %date% %time%"
git push

echo.
echo Done! Check github.com/tereh36/PPT_lego_generator to confirm.
pause
