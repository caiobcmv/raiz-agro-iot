from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg2.extras import RealDictCursor

from src.api.deps import get_conn
from src.api.schemas import (
    AlertaPreditivoCreate,
    AlertaPreditivoOut,
    CorteAlertaPreditivo,
)

router = APIRouter(prefix="/alertas-preditivos", tags=["Alertas Preditivos"])


@router.get("/cortes", response_model=List[CorteAlertaPreditivo])
def obter_cortes_preditivos(conn=Depends(get_conn)):
    query = """
        SELECT nivel, limiar_min, limiar_max, acao_recomendada
        FROM cortes_alerta_preditivo
        ORDER BY limiar_min ASC
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()


@router.get("", response_model=List[AlertaPreditivoOut])
def listar_alertas_preditivos(
    id_lote: Optional[int] = None,
    id_sensor: Optional[int] = None,
    nivel_severidade: Optional[str] = Query(None, alias="nivel"),
    status_filtro: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    conn=Depends(get_conn),
):
    query = """
        SELECT id_alerta_preditivo, id_sensor, id_lote, probabilidade_risco,
               nivel_severidade, mensagem, previsao_data_hora, status, data_geracao
        FROM alertas_preditivos
        WHERE 1=1
    """
    params = []

    if id_lote:
        query += " AND id_lote = %s"
        params.append(id_lote)

    if id_sensor:
        query += " AND id_sensor = %s"
        params.append(id_sensor)

    if nivel_severidade:
        query += " AND nivel_severidade = %s"
        params.append(nivel_severidade)

    if status_filtro:
        query += " AND status = %s"
        params.append(status_filtro)

    query += " ORDER BY data_geracao DESC LIMIT %s OFFSET %s"
    params.extend([limit, skip])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        return cur.fetchall()


@router.post("", response_model=AlertaPreditivoOut, status_code=status.HTTP_201_CREATED)
def criar_alerta_preditivo(
    payload: AlertaPreditivoCreate, conn=Depends(get_conn)
):
    dados = payload.model_dump()
    query = """
        INSERT INTO alertas_preditivos (
            id_sensor, id_lote, probabilidade_risco, nivel_severidade, mensagem, previsao_data_hora, status
        ) VALUES (
            %(id_sensor)s, %(id_lote)s, %(probabilidade_risco)s, %(nivel_severidade)s, %(mensagem)s, %(previsao_data_hora)s, %(status)s
        )
        RETURNING id_alerta_preditivo, id_sensor, id_lote, probabilidade_risco,
                  nivel_severidade, mensagem, previsao_data_hora, status, data_geracao
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, dados)
        novo = cur.fetchone()
    conn.commit()
    return novo


@router.patch("/{id_alerta_preditivo}/status", response_model=AlertaPreditivoOut)
def atualizar_status_alerta_preditivo(
    id_alerta_preditivo: int, status_novo: str, conn=Depends(get_conn)
):
    query = """
        UPDATE alertas_preditivos
        SET status = %s
        WHERE id_alerta_preditivo = %s
        RETURNING id_alerta_preditivo, id_sensor, id_lote, probabilidade_risco,
                  nivel_severidade, mensagem, previsao_data_hora, status, data_geracao
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, (status_novo, id_alerta_preditivo))
        resultado = cur.fetchone()

    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alerta preditivo não encontrado",
        )

    conn.commit()
    return resultado
