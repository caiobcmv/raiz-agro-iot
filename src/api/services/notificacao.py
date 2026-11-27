import logging
import os
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Optional

from psycopg2.extras import RealDictCursor

from src import config, database

log = logging.getLogger("notificacao")

NIVEIS = ("baixo", "médio", "alto")


class CanalErro(Exception):
    pass


class Canal:
    nome = ""
    padrao_ativo = False

    def enviar(self, usuario: dict, alerta: dict) -> None:
        raise NotImplementedError


def _uma_linha(texto) -> str:
    return " ".join(str(texto or "").split())


def montar_email(usuario: dict, alerta: dict) -> tuple[str, str]:
    nivel = _uma_linha(alerta.get("nivel")) or "alerta"
    descricao = _uma_linha(alerta.get("descricao")) or _uma_linha(alerta.get("tipo_alerta")) or "Novo alerta"
    assunto = f"[{nivel.upper()}] {descricao}"[:150]
    quando = alerta.get("data_hora")
    quando = quando.strftime("%d/%m/%Y %H:%M UTC") if hasattr(quando, "strftime") else "-"
    linhas = [f"Olá, {_uma_linha(usuario.get('nome')) or 'usuário'}.", "", descricao, "",
              f"Nível: {nivel}", f"Tipo: {_uma_linha(alerta.get('tipo_alerta')) or '-'}"]
    if alerta.get("id_lote"):
        linhas.append(f"Lote: {alerta['id_lote']}")
    linhas += [f"Detectado em: {quando}", "",
               "Você recebe este aviso porque o e-mail está ativo nas suas preferências de notificação."]
    return assunto, "\n".join(linhas) + "\n"


class CanalEmail(Canal):
    nome = "email"
    padrao_ativo = True

    def enviar(self, usuario: dict, alerta: dict) -> None:
        destino = _uma_linha(usuario.get("email"))
        if not destino:
            raise CanalErro("usuário sem e-mail")
        assunto, corpo = montar_email(usuario, alerta)

        if os.getenv("EMAIL_MODO_DEV", "false").lower() == "true":
            print(f"\n[EMAIL_MODO_DEV] Para: {destino}\nAssunto: {assunto}\n{corpo}\n")
            return

        host, user, senha = os.getenv("SMTP_HOST"), os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD")
        if not (host and user and senha):
            raise CanalErro("SMTP não configurado (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)")
        msg = EmailMessage()
        msg["From"] = os.getenv("EMAIL_FROM") or user
        msg["To"] = destino
        msg["Subject"] = assunto
        msg.set_content(corpo)
        try:
            porta = int(os.getenv("SMTP_PORT", "587"))
            if porta == 465:
                servidor = smtplib.SMTP_SSL(host, porta, timeout=15)
            else:
                servidor = smtplib.SMTP(host, porta, timeout=15)
            with servidor as s:
                if porta != 465:
                    s.starttls()
                s.login(user, senha)
                s.send_message(msg)
        except (smtplib.SMTPException, OSError, ValueError) as e:
            raise CanalErro(f"SMTP: {type(e).__name__}")


_CANAIS: dict[str, Canal] = {}


def registrar_canal(canal: Canal) -> None:
    _CANAIS[canal.nome] = canal


def canais_registrados() -> dict[str, Canal]:
    return dict(_CANAIS)


registrar_canal(CanalEmail())


def _agora() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _ordem(nivel) -> int:
    return NIVEIS.index(nivel) if nivel in NIVEIS else 0


def chave_dedup(alerta: dict) -> str:
    onde = alerta.get("id_lote") or alerta.get("id_sensor")
    return f"{alerta.get('tipo_alerta') or '-'}|{onde or '-'}|{alerta.get('nivel') or '-'}"[:200]


def _tratar_canal(conn, usuario: dict, alerta: dict, canal: Canal, agora: datetime) -> dict:
    uid, nome, chave = usuario["id_usuario"], canal.nome, chave_dedup(alerta)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""SELECT ativo, nivel_minimo::text AS nivel_minimo FROM notificacao_preferencia
                       WHERE fk_usuario_id_usuario = %s AND canal = %s""", (uid, nome))
        pref = cur.fetchone()
        ativo = pref["ativo"] if pref else canal.padrao_ativo
        minimo = pref["nivel_minimo"] if pref else "baixo"

        cur.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (f"{uid}|{nome}|{chave}",))

        status, motivo = "enviando", None
        if not ativo:
            status, motivo = "ignorado", "canal desativado pelo usuário"
        elif _ordem(alerta.get("nivel")) < _ordem(minimo):
            status, motivo = "ignorado", f"nível abaixo do mínimo escolhido ({minimo})"
        else:
            cur.execute("""SELECT 1 FROM notificacao_envio
                           WHERE fk_usuario_id_usuario = %s AND canal = %s AND chave_dedup = %s
                             AND status IN ('enviando', 'enviado') AND data_hora > %s LIMIT 1""",
                        (uid, nome, chave, agora - timedelta(minutes=config.NOTIFICACAO_INTERVALO_MIN)))
            if cur.fetchone():
                status = "suprimido"
                motivo = f"intervalo mínimo de {config.NOTIFICACAO_INTERVALO_MIN} min entre envios do mesmo alerta"

        cur.execute("""INSERT INTO notificacao_envio
                           (fk_usuario_id_usuario, fk_alerta_id_alerta, canal, status, motivo, chave_dedup, data_hora)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (fk_alerta_id_alerta, fk_usuario_id_usuario, canal) WHERE status <> 'falha'
                       DO NOTHING RETURNING id_notificacao_envio""",
                    (uid, alerta["id_alerta"], nome, status, motivo, chave, agora))
        linha = cur.fetchone()
    conn.commit()

    if linha is None:
        return {"canal": nome, "status": "ja_tratado", "motivo": "este alerta já foi tratado para o usuário"}
    if status != "enviando":
        return {"canal": nome, "status": status, "motivo": motivo}

    try:
        canal.enviar(usuario, alerta)
        status, motivo = "enviado", None
    except CanalErro as e:
        status, motivo = "falha", str(e)[:200]
    except Exception as e:
        status, motivo = "falha", f"erro inesperado: {type(e).__name__}"
        log.exception("Falha inesperada no canal %s", nome)
    with conn.cursor() as cur:
        cur.execute("UPDATE notificacao_envio SET status = %s, motivo = %s WHERE id_notificacao_envio = %s",
                    (status, motivo, linha["id_notificacao_envio"]))
    conn.commit()
    return {"canal": nome, "status": status, "motivo": motivo}


def enviar_notificacao(usuario: dict, alerta: dict, conn=None, canais: Optional[list] = None,
                       agora: Optional[datetime] = None) -> list[dict]:
    registrados = canais_registrados()
    nomes = canais if canais is not None else list(registrados)
    desconhecidos = [n for n in nomes if n not in registrados]
    if desconhecidos:
        raise ValueError(f"Canal desconhecido: {', '.join(desconhecidos)}")

    proprio = conn is None
    if proprio:
        conn = database.conectar()
    try:
        agora = agora or _agora()
        return [_tratar_canal(conn, usuario, alerta, registrados[n], agora) for n in nomes]
    finally:
        if proprio:
            conn.close()


SQL_ALERTAS_PENDENTES = """
    SELECT a.id_alerta, a.tipo_alerta, a.descricao, a.nivel::text AS nivel, a.data_hora,
           s.id_sensor, s.fk_lote_id_lote AS id_lote
      FROM alerta a
      LEFT JOIN leitura_climatica r ON r.id_leitura = a.fk_leitura_id_leitura
      LEFT JOIN sensor s ON s.id_sensor = r.fk_sensor_id_sensor
     WHERE lower(a.status) = 'aberto'
       AND a.data_hora >= %(desde)s
       AND (
            NOT EXISTS (SELECT 1 FROM notificacao_envio n WHERE n.fk_alerta_id_alerta = a.id_alerta)
            OR EXISTS (
                SELECT 1 FROM notificacao_envio f
                 WHERE f.fk_alerta_id_alerta = a.id_alerta AND f.status = 'falha'
                 GROUP BY f.fk_usuario_id_usuario, f.canal
                HAVING count(*) < %(max_tentativas)s AND max(f.data_hora) <= %(retry_antes)s
                   AND NOT EXISTS (SELECT 1 FROM notificacao_envio ok
                                    WHERE ok.fk_alerta_id_alerta = a.id_alerta
                                      AND ok.fk_usuario_id_usuario = f.fk_usuario_id_usuario
                                      AND ok.canal = f.canal AND ok.status <> 'falha')
            )
       )
     ORDER BY a.id_alerta
     LIMIT %(limite)s
"""


def processar_alertas_pendentes(conn=None, limite: int = 50, agora: Optional[datetime] = None) -> dict:
    proprio = conn is None
    if proprio:
        conn = database.conectar()
    totais = {"alertas": 0, "enviado": 0, "suprimido": 0, "ignorado": 0, "falha": 0, "ja_tratado": 0, "erro": 0}
    try:
        agora = agora or _agora()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(SQL_ALERTAS_PENDENTES, {
                "desde": agora - timedelta(hours=config.NOTIFICACAO_JANELA_HORAS),
                "max_tentativas": config.NOTIFICACAO_MAX_TENTATIVAS,
                "retry_antes": agora - timedelta(minutes=config.NOTIFICACAO_RETRY_MIN),
                "limite": limite})
            alertas = cur.fetchall()
            sql_usuarios = """SELECT u.id_usuario, u.nome, u.email FROM usuario u
                              JOIN perfil p ON p.id_perfil = u.fk_perfil_id_perfil
                              WHERE u.status = 'ativo' AND coalesce(u.email, '') <> ''"""
            args = ()
            if config.NOTIFICACAO_PERFIS:
                sql_usuarios += " AND lower(p.nome) = ANY(%s)"
                args = (config.NOTIFICACAO_PERFIS,)
            cur.execute(sql_usuarios + " ORDER BY u.id_usuario", args)
            usuarios = cur.fetchall()
        conn.rollback()

        for alerta in alertas:
            totais["alertas"] += 1
            for usuario in usuarios:
                try:
                    for r in enviar_notificacao(usuario, alerta, conn=conn, agora=agora):
                        totais[r["status"]] += 1
                except Exception:
                    conn.rollback()
                    totais["erro"] += 1
                    log.exception("Erro ao notificar alerta %s", alerta["id_alerta"])
        return totais
    finally:
        if proprio:
            conn.close()