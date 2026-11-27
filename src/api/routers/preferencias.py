from typing import Any, Dict
from fastapi import APIRouter, Depends, Request
from src.api.deps_auth import get_current_user

router = APIRouter(prefix="/preferencias", tags=["preferencias"])

# Em memória / padrão para preferências de gráficos
_preferencias_graficos: Dict[str, Any] = {}

@router.get("/graficos")
def obter_preferencias_graficos(user=Depends(get_current_user)):
    """Retorna as preferências de gráficos salvas do usuário ou padrão vazio (HTTP 200)."""
    return _preferencias_graficos.get(str(user.get("id_usuario")), {})

@router.put("/graficos")
async def salvar_preferencias_graficos(request: Request, user=Depends(get_current_user)):
    """Salva preferências de gráficos do usuário (HTTP 200)."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    _preferencias_graficos[str(user.get("id_usuario"))] = payload
    return payload
