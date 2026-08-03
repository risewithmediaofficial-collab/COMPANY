@echo off
setlocal

title RISE WITH MEDIA - Production Server
color 0A

if not exist "%~dp0backend\.env" (
  echo Missing backend/.env file.
  echo Copy backend/.env.production.example to backend/.env and update values.
  pause
  exit /b 1
)

cd /d "%~dp0backend"

echo.
echo ================================================
echo  RISE WITH MEDIA - Starting Production Server
echo ================================================
echo.

echo [1/3] Building frontend...
cd /d "%~dp0frontend"
call npm install
call npm run build

if errorlevel 1 (
  echo Frontend production build failed.
  pause
  exit /b 1
)

echo.
echo [2/3] Starting backend in production mode...
cd /d "%~dp0backend"
start "Agency CRM API" cmd /k "set NODE_ENV=production&& npm start"

echo.
echo [3/3] Production startup launched.

echo Backend health check: http://localhost:5000/api/health

echo Frontend static build: %~dp0frontend\dist

echo.
echo Done.
pause
