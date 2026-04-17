@echo off
rem AudioFlow Start Script (Windows)
rem Usage: start.bat [frontend|backend|all]

setlocal

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

if "%1"=="" goto all
if "%1"=="frontend" goto frontend
if "%1"=="backend" goto backend
if "%1"=="all" goto all

:usage
echo Usage: %0 [frontend^|backend^|all]
echo   frontend - Start only the Vite dev server (port 3000)
echo   backend  - Start only the ASP.NET backend (port 5000)
echo   all      - Start both frontend and backend (default)
exit /b 1

:frontend
echo Starting AudioFlow Frontend (Vite)...
cd /d "%PROJECT_ROOT%\src\AudioFlow.Client"
npm run dev
goto :end

:backend
echo Starting AudioFlow Backend (ASP.NET)...
cd /d "%PROJECT_ROOT%\src\AudioFlow.Server"
dotnet run
goto :end

:all
echo Starting AudioFlow (Frontend + Backend)...
echo This will run both...

rem Start backend in new window
start "AudioFlow Backend" cmd /c "cd /d %PROJECT_ROOT%\src\AudioFlow.Server && dotnet run"

rem Wait for backend to start
timeout /t 3 /nobreak >nul

rem Start frontend
cd /d "%PROJECT_ROOT%\src\AudioFlow.Client"
npm run dev

:end
endlocal
