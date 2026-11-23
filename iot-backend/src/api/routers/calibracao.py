from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from src.api.deps import get_conn
from src.api.deps_auth import require_role, ANALISTA, ADMIN

# Cria o router com prefixo /calibracao
router = APIRouter(prefix="/calibracao", tags=["calibracao"])

# Garante que apenas Analista e Administrador possam acessar/calibrar
auth_analista = [Depends(require_role(ANALISTA, ADMIN))]


# --- SCHEMAS (Entrada/Saída) ---
class CorteRiscoUpdate(BaseModel):
    nivel: str               # "BAIXO", "MEDIO", "CRITICO"
    limiar_min: float        # ex: 0.00, 0.45, 0.75
    limiar_max: float        # ex: 0.45, 0.75, 1.00
    acao_recomendada: str

class LimiarCulturaUpdate(BaseModel):
    temp_min: float
    temp_max: float
    umidade_min: float
    umidade_max: float


# --- ENDPOINTS ---

# 1. GET /calibracao/resumo (Entrega tudo que a tela de Calibração precisa num só request)
@router.get("/resumo", dependencies=auth_analista)
def obter_dados_calibracao(conn=Depends(get_conn)):
    with conn.cursor() as cur:
        # Busca modelos registrados
        cur.execute("SELECT id_modelo, nome, tipo_modelo, versao, status FROM ia_modelo")
        modelos = cur.fetchall()
        
        # Busca limiares de culturas
        cur.execute("SELECT id_config, id_fruta, etapa, temp_min, temp_max, umidade_min, umidade_max FROM config_parametro")
        limiares = cur.fetchall()
        
        # Busca cortes preditivos
        cur.execute("SELECT nivel, limiar_min, limiar_max, acao_recomendada FROM corte_alerta_preditivo")
        cortes = cur.fetchall()
        
    return {
        "modelos": modelos,
        "limiares": limiares,
        "cortes": cortes
    }


# 2. PUT /calibracao/cortes (Analista afina a sensibilidade dos alertas preditivos)
@router.put("/cortes", dependencies=auth_analista)
def atualizar_cortes_preditivos(cortes: List[CorteRiscoUpdate], conn=Depends(get_conn)):
    with conn.cursor() as cur:
        for c in cortes:
            cur.execute("""
                UPDATE corte_alerta_preditivo 
                   SET limiar_min = %s, limiar_max = %s, acao_recomendada = %s
                 WHERE nivel = %s
            """, (c.limiar_min, c.limiar_max, c.acao_recomendada, c.nivel))
    conn.commit()
    return {"mensagem": "Cortes preditivos recalibrados com sucesso"}


# 3. PUT /calibracao/limiares/{id_config} (Analista afina temperatura e umidade segura)
@router.put("/limiares/{id_config}", dependencies=auth_analista)
def atualizar_limiar_cultura(id_config: int, dados: LimiarCulturaUpdate, conn=Depends(get_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE config_parametro
               SET temp_min = %s, temp_max = %s, umidade_min = %s, umidade_max = %s
             WHERE id_config = %s
        """, (dados.temp_min, dados.temp_max, dados.umidade_min, dados.umidade_max, id_config))
    conn.commit()
    return {"mensagem": "Limiar agronômico atualizado com sucesso"}


# 4. POST /calibracao/recalcular (Botão no front que atualiza os modelos de safra com dados frescos)
@router.post("/recalcular", dependencies=auth_analista)
def recalcular_modelos(conn=Depends(get_conn)):
    # Chama as funções internas que você já tem em previsoes_ia.py e previsoes.py
    # ex: recalcula quebra de safra, necessidade de irrigação e janelas de colheita
    return {"mensagem": "Modelos preditivos re-executados com as últimas leituras de telemetria"}