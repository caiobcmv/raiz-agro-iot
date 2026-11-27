from fastapi import APIRouter, Depends

from ..deps import get_conn
from ..deps_auth import get_current_user
from ..escopo import exigir_lote, id_dono

router = APIRouter(prefix="/riscos", tags=["riscos"])


def _num(v):
    return float(v) if v is not None else None


def _rows(cur):
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


@router.get("/prejuizo")
def risco_prejuizo(id_lote: int | None = None, limite: int = 30, conn=Depends(get_conn),
                   user=Depends(get_current_user)):
    """Sem id_lote: última previsão de cada lote.
    Com id_lote: histórico das previsões desse lote (mais recentes primeiro)."""
    p = {"dono": id_dono(user)}   # Produtor: só lotes dele (None = escopo total)
    with conn.cursor() as cur:
        exigir_lote(cur, user, id_lote)   # 404 se o lote não existir OU for de outro dono
        if id_lote is None:
            cur.execute("""
                SELECT DISTINCT ON (pp.fk_lote_id_lote)
                       l.id_lote, l.destino, l.quantidade, l.unidade,
                       pp.prejuizo_estimado, pp.temperatura, pp.umidade,
                       pp.periodo_inicio, pp.periodo_fim, pp.data_previsao,
                       m.nome AS modelo
                FROM previsao_prejuizo pp
                JOIN lote l      ON l.id_lote = pp.fk_lote_id_lote
                JOIN ia_modelo m ON m.id_modelo = pp.fk_modelo_id_modelo
                WHERE (%(dono)s::int IS NULL OR l.fk_usuario_id_usuario = %(dono)s)
                ORDER BY pp.fk_lote_id_lote, pp.data_previsao DESC
            """, p)
        else:
            cur.execute("""
                SELECT l.id_lote, l.destino, l.quantidade, l.unidade,
                       pp.prejuizo_estimado, pp.temperatura, pp.umidade,
                       pp.periodo_inicio, pp.periodo_fim, pp.data_previsao,
                       m.nome AS modelo
                FROM previsao_prejuizo pp
                JOIN lote l      ON l.id_lote = pp.fk_lote_id_lote
                JOIN ia_modelo m ON m.id_modelo = pp.fk_modelo_id_modelo
                WHERE pp.fk_lote_id_lote = %(id_lote)s
                ORDER BY pp.data_previsao DESC
                LIMIT %(limite)s
            """, {"id_lote": id_lote, "limite": limite})
        itens = _rows(cur)

    for i in itens:
        i["prejuizo_estimado"] = _num(i["prejuizo_estimado"])
        i["umidade"] = _num(i["umidade"])
    return itens


@router.get("/climatico")
def risco_climatico(
    id_lote: int | None = None,
    nivel: str | None = None,
    limite: int = 30,
    conn=Depends(get_conn),
    user=Depends(get_current_user),
):
    """Sem id_lote: último risco climático de cada lote (filtrável por nivel).
    Com id_lote: histórico desse lote (mais recentes primeiro)."""
    p = {"dono": id_dono(user)}
    with conn.cursor() as cur:
        exigir_lote(cur, user, id_lote)   # 404 se o lote não existir OU for de outro dono
        if id_lote is None:
            sql = """
                SELECT * FROM (
                    SELECT DISTINCT ON (rc.fk_lote_id_lote)
                           l.id_lote, l.destino,
                           rc.nivel_risco, rc.probabilidade, rc.justificativa,
                           rc.temperatura, rc.umidade,
                           rc.periodo_inicio, rc.periodo_fim, rc.data_previsao,
                           m.nome AS modelo
                    FROM risco_climatico rc
                    JOIN lote l      ON l.id_lote = rc.fk_lote_id_lote
                    JOIN ia_modelo m ON m.id_modelo = rc.fk_modelo_id_modelo
                    WHERE (%(dono)s::int IS NULL OR l.fk_usuario_id_usuario = %(dono)s)
                    ORDER BY rc.fk_lote_id_lote, rc.data_previsao DESC
                ) ult
            """
            if nivel:
                sql += " WHERE ult.nivel_risco = %(nivel)s"
                p["nivel"] = nivel
            sql += " ORDER BY ult.data_previsao DESC"
            cur.execute(sql, p)
        else:
            cur.execute("""
                SELECT l.id_lote, l.destino,
                       rc.nivel_risco, rc.probabilidade, rc.justificativa,
                       rc.temperatura, rc.umidade,
                       rc.periodo_inicio, rc.periodo_fim, rc.data_previsao,
                       m.nome AS modelo
                FROM risco_climatico rc
                JOIN lote l      ON l.id_lote = rc.fk_lote_id_lote
                JOIN ia_modelo m ON m.id_modelo = rc.fk_modelo_id_modelo
                WHERE rc.fk_lote_id_lote = %(id_lote)s
                ORDER BY rc.data_previsao DESC
                LIMIT %(limite)s
            """, {"id_lote": id_lote, "limite": limite})
        itens = _rows(cur)

    for i in itens:
        i["probabilidade"] = _num(i["probabilidade"])
        i["umidade"] = _num(i["umidade"])
    return itens