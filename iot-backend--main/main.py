"""
Ponto de entrada principal para servidores ASGI e plataformas de deploy (uvicorn, render, railway, vercel).
"""
from src.api.app import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
