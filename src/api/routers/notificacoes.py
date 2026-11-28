from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

from src import config
from src.api.auditoria import auditar
from src.api.deps import get_conn
from src.api.deps_auth import ADMIN, get_current_user, require_role
from src.api.services import notificacao

router = APIRouter(prefix="/notificacoes", tags=["notificacoes"])


class PreferenciaOut(BaseModel):
    canal: str
    ativo: bool
    nivel_minimo: str
    definida_pelo_usuario: bool


class PreferenciaIn(BaseModel):
    ativo: bool
    nivel_minimo: Optional[Literal["baixo", "médio", "alto"]] = None


class EnvioOut(BaseModel):
    id_notificacao_envio: int
    id_usuario: int
    id_alerta: int
    canal: str
    status: str
    motivo: Optional[str] = None
    data_hora: str


def _iso(dt) -> str:
    return dt.isoformat() + "Z"


def _preferencias(cur, id_usuario: int) -> list:
    cur.execute("""SELECT canal, ativo, nivel_minimo::text AS nivel_minimo FROM notificacao_preferencia
                   WHERE fk_usuario_id_usuario = %s""", (id_usuario,))
    salvas = {r["canal"]: r for r in cur.fetchall()}
    saida = []
    for nome, canal in notificacao.canais_registrados().items():
        p = salvas.get(nome)
        saida.append({"canal": nome, "ativo": p["ativo"] if p else canal.padrao_ativo,
                      "nivel_minimo": p["nivel_minimo"] if p else "baixo",
                      "definida_pelo_usuario": p is not None})
    return saida


@router.get("/preferencias", response_model=List[PreferenciaOut])
def minhas_preferencias(conn=Depends(get_conn), user=Depends(get_current_user)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        return _preferencias(cur, user["id_usuario"])


@router.put("/preferencias/{canal}", response_model=PreferenciaOut)
def salvar_preferencia(canal: str, dados: PreferenciaIn, request: Request,
                       conn=Depends(get_conn), user=Depends(get_current_user)):
    with auditar(request, "salvar_preferencia_notificacao", user["id_usuario"]) as ctx:
        ctx.detalhe = f"canal={canal} ativo={dados.ativo}"
        if canal not in notificacao.canais_registrados():
            raise HTTPException(status_code=404, detail="Canal de notificação desconhecido")
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO notificacao_preferencia (fk_usuario_id_usuario, canal, ativo, nivel_minimo)
                VALUES (%s, %s, %s, COALESCE(%s::nivel_alerta, 'baixo'))
                ON CONFLICT (fk_usuario_id_usuario, canal) DO UPDATE
                   SET ativo = EXCLUDED.ativo,
                       nivel_minimo = COALESCE(%s::nivel_alerta, notificacao_preferencia.nivel_minimo),
                       data_atualizacao = now() AT TIME ZONE 'UTC'
                """, (user["id_usuario"], canal, dados.ativo, dados.nivel_minimo, dados.nivel_minimo))
            conn.commit()
            return next(p for p in _preferencias(cur, user["id_usuario"]) if p["canal"] == canal)


@router.get("/historico", response_model=List[EnvioOut])
def historico(status: Optional[str] = None, canal: Optional[str] = None,
              id_usuario: Optional[int] = Query(None, description="Só o Administrador pode ver o de outro usuário"),
              limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0),
              conn=Depends(get_conn), user=Depends(get_current_user)):
    eh_admin = user["perfil"].lower() == ADMIN.lower()
    if id_usuario is not None and id_usuario != user["id_usuario"] and not eh_admin:
        raise HTTPException(status_code=403, detail="Perfil sem permissão para este recurso")
    alvo = id_usuario if id_usuario is not None else user["id_usuario"]
    where, params = ["fk_usuario_id_usuario = %s"], [alvo]
    if status:
        where.append("status = %s")
        params.append(status)
    if canal:
        where.append("canal = %s")
        params.append(canal)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f"""SELECT id_notificacao_envio, fk_usuario_id_usuario AS id_usuario,
                               fk_alerta_id_alerta AS id_alerta, canal, status, motivo, data_hora
                        FROM notificacao_envio WHERE {' AND '.join(where)}
                        ORDER BY data_hora DESC, id_notificacao_envio DESC LIMIT %s OFFSET %s""",
                    params + [limit, offset])
        linhas = cur.fetchall()
    for r in linhas:
        r["data_hora"] = _iso(r["data_hora"])
    return linhas


@router.post("/processar")
def processar(request: Request, limite: int = Query(50, ge=1, le=500),
              conn=Depends(get_conn), user=Depends(require_role(ADMIN))):
    with auditar(request, "processar_notificacoes", user["id_usuario"]):
        if not config.NOTIFICACAO_ATIVA:
            raise HTTPException(status_code=409, detail="Notificações desativadas (NOTIFICACAO_ATIVA=false)")
        return notificacao.processar_alertas_pendentes(conn=conn, limite=limite)