@echo off
setlocal

set "NODE_HOME=C:\Program Files\nodejs"
if not exist "%NODE_HOME%\node.exe" (
  echo Node.js not found at "%NODE_HOME%".
  echo Install Node LTS, then run this file again.
  pause
  exit /b 1
)

set "PATH=%NODE_HOME%;%PATH%"
cd /d "%~dp0"

echo Starting Vista site dev server on http://localhost:4321 ...
call "%NODE_HOME%\npm.cmd" run dev -- --host localhost --port 4321

echo.
echo Dev server stopped. Press any key to close.
pause >nul
