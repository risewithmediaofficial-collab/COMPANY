@echo off
title RISE WITH MEDIA - Dev Server
color 0A

echo.
echo  ================================================
echo   RISE WITH MEDIA - Starting Dev Environment
echo  ================================================
echo.

:: ── Start MongoDB ─────────────────────────────────
echo [1/2] Starting MongoDB...

:: Create data directory if it doesn't exist
if not exist "E:\mongodb-data\db" mkdir "E:\mongodb-data\db"
if not exist "E:\mongodb-data\log" mkdir "E:\mongodb-data\log"

:: Kill any stuck mongod first
taskkill /F /IM mongod.exe >nul 2>&1

:: Start mongod in background
start "" /B "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" ^
  --dbpath "E:\mongodb-data\db" ^
  --logpath "E:\mongodb-data\log\mongod.log" ^
  --logappend ^
  --port 27017

:: Wait for MongoDB to be ready
echo Waiting for MongoDB to start...
timeout /t 4 /nobreak >nul

:: Quick check if port is open
netstat -an | find "27017" | find "LISTENING" >nul
if %errorlevel% == 0 (
  echo [OK] MongoDB is listening on port 27017
) else (
  echo [WARN] MongoDB may still be starting up - backend will retry automatically
)

echo.
echo [2/2] Starting Backend Server...
echo.

:: Start backend
cd /d "E:\risewithmedia projects\COMPANY\backend"
start "Backend (Port 5002)" cmd /k "npm run dev"

echo.
echo  ================================================
echo   Dev environment started!
echo   Backend  : http://localhost:5002
echo   Frontend : run 'npm run dev' in /frontend
echo  ================================================
echo.
pause
