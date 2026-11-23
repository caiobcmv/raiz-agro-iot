from typing import List, Optional

from pydantic import BaseModel, Field, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from psycopg2.extras import RealDictCursor

from src.api.auditoria import auditar
from src.api.deps import get_conn
from src.api.deps_auth import get_current_user
from src.api.escopo import id_dono
from src.api.schemas import (
    AlertaPreditivoCreate,
    AlertaPreditivoOut,
    CorteAlertaPreditivo,
)

router = APIRouter(prefix="/alertas-preditivos", tags=["Alertas Preditivos"])


class CorteUpdate(BaseModel):
    limiar_min: float = Field(..., ge=0.0, le=1.0)
    limiar_max: float = Field(..., ge=0.0, le=1.0)
    acao_recomendada: str = Field(..., min_length=1, max_length=500)

    @model_validator(mode="after")
    def _faixa(self):
        if self.limiar_min > self.limiar_max:
            raise ValueError("limiar_min não pode ser maior que limiar_max")
        return self

COLUNAS = """id_alerta_preditivo, id_sensor, id_lote, probabilidade_risco,
             nivel_severidade, mensagem, previsao_data_hora, status, data_geracao"""


@router.get("/cortes", response_model=List[CorteAlertaPreditivo])
def obter_cortes_preditivos(conn=Depends(get_conn)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT nivel, limiar_min, limiar_max, acao_recomendada
            FROM cortes_alerta_preditivo
            ORDER BY limiar_min ASC
            """
        )
        return cur.fetchall()


@router.put("/cortes/{nivel}", response_model=CorteAlertaPreditivo)
def atualizar_corte(nivel: str, dados: CorteUpdate, request: Request, conn=Depends(get_conn)):
    """Edita faixa e ação de um corte (BAIXO, MEDIO, CRITICO). Faixas não podem se sobrepor."""
    with auditar(request, "atualizar_corte_preditivo") as ctx:
        ctx.detalhe = f"nivel={nivel}"
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT 1 FROM cortes_alerta_preditivo WHERE upper(nivel) = upper(%s)", (nivel,))
            if cur.fetchone() is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Corte não encontrado")
            cur.execute(
                """
                SELECT nivel FROM cortes_alerta_preditivo
                 WHERE upper(nivel) <> upper(%s)
                   AND limiar_min <= %s AND limiar_max >= %s
                """,
                (nivel, dados.limiar_max, dados.limiar_min),
            )
            conflito = cur.fetchone()
            if conflito:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"A faixa se sobrepõe ao corte {conflito['nivel']}",
                )
            cur.execute(
                """
                UPDATE cortes_alerta_preditivo
                   SET limiar_min = %s, limiar_max = %s, acao_recomendada = %s,
                       data_atualizacao = CURRENT_TIMESTAMP
                 WHERE upper(nivel) = upper(%s)
                RETURNING nivel, limiar_min, limiar_max, acao_recomendada
                """,
                (dados.limiar_min, dados.limiar_max, dados.acao_recomendada.strip(), nivel),
            )
            atualizado = cur.fetchone()
        conn.commit()
    return atualizado


@router.post("/reconhecer-todos")
def reconhecer_todos_preditivos(conn=Depends(get_conn)):
    """Move todos os preditivos 'EM ABERTO' para 'RECONHECIDO'."""
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE alertas_preditivos SET status = 'RECONHECIDO' WHERE upper(status) = 'EM ABERTO'"
        )
        n = cur.rowcount
    conn.commit()
    return {"reconhecidos": n}


@router.get("", response_model=List[AlertaPreditivoOut])
def listar_alertas_preditivos(
    id_lote: Optional[int] = None,
    id_sensor: Optional[int] = None,
    nivel_severidade: Optional[str] = Query(None, alias="nivel"),
    status_filtro: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    conn=Depends(get_conn),
    user=Depends(get_current_user),
):
    where, params = [], []
    dono = id_dono(user)
    if dono is not None:  # Produtor: só alertas dos lotes/sensores dele
        where.append("(id_lote IN (SELECT id_lote FROM lote WHERE fk_usuario_id_usuario = %s)"
                     " OR id_sensor IN (SELECT id_sensor FROM sensor WHERE fk_usuario_id_usuario = %s))")
        params += [dono, dono]
    if id_lote is not None:
        where.append("id_lote = %s")
        params.append(id_lote)
    if id_sensor is not None:
        where.append("id_sensor = %s")
        params.append(id_sensor)
    if nivel_severidade:
        where.append("upper(nivel_severidade) = upper(%s)")
        params.append(nivel_severidade)
    if status_filtro:
        where.append("upper(status) = upper(%s)")
        params.append(status_filtro)

    sql = (f"SELECT {COLUNAS} FROM alertas_preditivos"
           + (" WHERE " + " AND ".join(where) if where else "")
           + " ORDER BY data_geracao DESC, id_alerta_preditivo DESC LIMIT %s OFFSET %s")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params + [limit, skip])
        return cur.fetchall()


@router.post("", response_model=AlertaPreditivoOut, status_code=status.HTTP_201_CREATED)
def criar_alerta_preditivo(
    payload: AlertaPreditivoCreate, request: Request, conn=Depends(get_conn)
):
    with auditar(request, "criar_alerta_preditivo") as ctx:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                INSERT INTO alertas_preditivos (
                    id_sensor, id_lote, probabilidade_risco, nivel_severidade,
                    mensagem, previsao_data_hora, status
                ) VALUES (
                    %(id_sensor)s, %(id_lote)s, %(probabilidade_risco)s, %(nivel_severidade)s,
                    %(mensagem)s, %(previsao_data_hora)s, %(status)s
                )
                RETURNING {COLUNAS}
                """,
                payload.model_dump(),
            )
            novo = cur.fetchone()
        conn.commit()
        ctx.detalhe = f"id={novo['id_alerta_preditivo']}"
    return novo


@router.patch("/{id_alerta_preditivo}/status", response_model=AlertaPreditivoOut)
def atualizar_status_alerta_preditivo(
    id_alerta_preditivo: int,
    status_novo: str,
    request: Request,
    conn=Depends(get_conn),
):
    with auditar(request, "atualizar_status_alerta_preditivo") as ctx:
        ctx.detalhe = f"id={id_alerta_preditivo} status={status_novo}"
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                UPDATE alertas_preditivos
                   SET status = %s
                 WHERE id_alerta_preditivo = %s
                RETURNING {COLUNAS}
                """,
                (status_novo, id_alerta_preditivo),
            )
            resultado = cur.fetchone()
        if not resultado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alerta preditivo não encontrado",
            )
        conn.commit()
    return resultado