@echo off
title DataAgent Launcher
echo ============================================
echo   DataAgent - Starting servers...
echo ============================================
echo.

:: Kill any process already using port 8000 to avoid conflicts
echo [0/2] Checking for port conflicts...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING" 2^>nul') do (
    echo     Killing existing process on port 8000 (PID %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

:: Start FastAPI backend in a new window
echo [1/2] Starting FastAPI backend on http://localhost:8000 ...
start "DataAgent Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait longer for the backend to initialize (5 seconds)
echo     Waiting for backend to start...
timeout /t 5 /nobreak >nul

:: Start Vite frontend in a new window
echo [2/2] Starting Vite frontend on http://localhost:5173 ...
start "DataAgent Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo   Both servers are starting!
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo ============================================
echo.
echo TIP: Open http://localhost:5173 in your browser.
echo      If you see a connection error, wait ~5s and refresh.
echo.
echo Close the Backend/Frontend windows to stop the servers.
pause
