@echo off
title RAIZ Agro IoT - Servidor & Backend Local
cd /d "%~dp0"
echo ====================================================
echo   RAIZ Agro IoT - Servidor & Backend Local
echo ====================================================
echo.
echo Liberando portas 5173 e 8000 de processos antigos...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo.
echo Abrindo http://localhost:5173/#/dashboard no seu navegador...
start http://localhost:5173/#/dashboard
echo.
echo Pressione Ctrl+C para encerrar o servidor.
echo.
node server.js
pause
