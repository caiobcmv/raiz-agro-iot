@echo off
title RAIZ Agro - Backend FastAPI
cd /d "%~dp0iot-backend--main"

echo ========================================================
echo   Iniciando Backend RAIZ (FastAPI + Uvicorn)
echo ========================================================
echo.

if not exist ".env" (
    if exist ".env.example" (
        echo Criando arquivo .env a partir de .env.example...
        copy .env.example .env
    )
)

set "PY_BIN=python"
if exist ".venv\Scripts\python.exe" set "PY_BIN=.venv\Scripts\python.exe"

echo Verificando dependencias Python...
"%PY_BIN%" -m pip install -r requirements.txt

echo.
echo Iniciando servidor Uvicorn na porta 8000...
echo Acesse a documentacao em:  http://localhost:8000/docs
echo.
"%PY_BIN%" -m uvicorn src.api.app:app --reload --port 8000 --host 0.0.0.0

pause

