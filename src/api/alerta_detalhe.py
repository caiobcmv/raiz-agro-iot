"""Monta o detalhe dinâmico de um alerta (tiles, curva, contexto) sem depender de FastAPI.

A API decide O QUE mostrar (lista `metricas`); o front só desenha. Se amanhã entrar um sensor
de solo, basta acrescentar uma métrica em `montar_metricas` — o front não muda.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

MARGEM_ATENCAO = 0.10          # 10% da largura da faixa, colado no limite = "atencao"
JANELA_SERIE_HORAS = 2
SENSOR_SEM_LEITURA_MIN = 30    # acima disso o card avisa que o sensor parou

# (chave, rótulo, unidade, coluna da leitura, colunas do config_parametro)
METRICAS_CONFIG = [
    ("temperatura", "Temperatura", "°C", "temperatura", "temp_min", "temp_max"),
    ("umidade", "Umidade do ar", "%", "umidade", "umidade_min", "umidade_max"),
]

_ORDEM_STATUS = {"critico": 0, "atencao": 1, "ok": 2, "sem_limite": 3, "sem_leitura": 4}


def titulo_e_foco(tipo_alerta: Optional[str]) -> Tuple[str, Optional[str]]:
    """A trigger grava tipo_alerta como 'temperatura_fora_faixa' / 'umidade_fora_faixa'."""
    tipo = (tipo_alerta or "").lower()
    for chave, label, *_ in METRICAS_CONFIG:
        if tipo.startswith(chave):
            return f"{label} fora da faixa", chave
    return (tipo_alerta or "Alerta").replace("_", " ").capitalize(), None


def _f(valor) -> Optional[float]:
    return None if valor is None else float(valor)


def iso_utc(dt: Optional[datetime]) -> Optional[str]:
    """O banco guarda UTC sem fuso; devolve ISO 8601 com Z (igual ao resto da API)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def classificar(valor: Optional[float], minimo: Optional[float],
                maximo: Optional[float]) -> Tuple[str, Optional[float]]:
    """Devolve (status, desvio). desvio > 0 = acima do máximo; < 0 = abaixo do mínimo."""
    if valor is None:
        return "sem_leitura", None
    if minimo is None and maximo is None:
        return "sem_limite", None
    if maximo is not None and valor > maximo:
        return "critico", round(valor - maximo, 2)
    if minimo is not None and valor < minimo:
        return "critico", round(valor - minimo, 2)
    if minimo is not None and maximo is not None:
        margem = (maximo - minimo) * MARGEM_ATENCAO
        if valor >= maximo - margem or valor <= minimo + margem:
            return "atencao", None
    return "ok", None


def montar_metricas(leitura: Optional[dict], limites: Optional[dict]) -> List[dict]:
    """Uma métrica por grandeza medida, ordenadas com as que violam o limite primeiro."""
    metricas = []
    for chave, label, unidade, col_leitura, col_min, col_max in METRICAS_CONFIG:
        valor = _f(leitura.get(col_leitura)) if leitura else None
        mn = _f(limites.get(col_min)) if limites else None
        mx = _f(limites.get(col_max)) if limites else None
        status, desvio = classificar(valor, mn, mx)
        metricas.append({
            "chave": chave, "label": label, "unidade": unidade, "valor": valor,
            "limite_min": mn, "limite_max": mx, "status": status, "desvio": desvio,
        })
    metricas.sort(key=lambda m: _ORDEM_STATUS[m["status"]])
    return metricas


def _num(v: float) -> str:
    return f"{v:.1f}".replace(".", ",")


def resumo(metricas: List[dict]) -> Optional[str]:
    """Frase curta sobre a pior métrica, ex.: '34,1°C — 2,1°C acima do máximo de 32,0°C'."""
    if not metricas:
        return None
    m = metricas[0]
    if m["status"] == "sem_leitura":
        return "Sem leitura recente do sensor"
    base = f"{m['label']}: {_num(m['valor'])}{m['unidade']}"
    if m["status"] == "critico" and m["desvio"] is not None:
        if m["desvio"] > 0:
            return f"{base} — {_num(m['desvio'])}{m['unidade']} acima do máximo de {_num(m['limite_max'])}{m['unidade']}"
        return f"{base} — {_num(abs(m['desvio']))}{m['unidade']} abaixo do mínimo de {_num(m['limite_min'])}{m['unidade']}"
    if m["status"] == "atencao":
        return f"{base} — próxima do limite da faixa"
    return base


def minutos_desde(dt: Optional[datetime], agora: Optional[datetime] = None) -> Optional[int]:
    if dt is None:
        return None
    agora = agora or datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return max(0, int((agora - dt).total_seconds() // 60))


def acoes_disponiveis(status_alerta: Optional[str], tem_sensor: bool) -> List[str]:
    """Só ações que têm endpoint de verdade."""
    acoes = []
    if (status_alerta or "").lower() == "aberto":
        acoes.append("reconhecer")          # PATCH /alertas/{id}/status
    if tem_sensor:
        acoes.append("ver_historico")       # GET /leituras?id_sensor=...
    return acoes


def montar_detalhe(alerta: dict, contexto: Optional[dict], limites: Optional[dict],
                   leitura_atual: Optional[dict], serie: List[dict],
                   leitura_gatilho: Optional[dict] = None,
                   agora: Optional[datetime] = None) -> Dict:
    """Junta tudo no JSON que o front consome. `alerta` já vem no formato de AlertaOut."""
    titulo, foco = titulo_e_foco(alerta.get("tipo_alerta"))
    metricas = montar_metricas(leitura_atual, limites)
    if foco:  # a métrica que disparou o alerta vem primeiro (sort estável)
        metricas.sort(key=lambda m: m["chave"] != foco)
    sem_leit = minutos_desde(leitura_atual["data_hora"], agora) if leitura_atual else None
    tem_sensor = contexto is not None
    return {
        "alerta": alerta,
        "titulo": titulo,
        "foco": foco,
        "layout": "leitura" if leitura_atual else "sem_leitura",
        "resumo": resumo(metricas) if leitura_atual else None,
        "lote": None if not contexto or contexto.get("id_lote") is None else {
            "id_lote": contexto["id_lote"], "fruta": contexto.get("fruta"),
            "quantidade": contexto.get("quantidade"), "unidade": contexto.get("unidade"),
            "etapa": contexto.get("etapa"), "destino": contexto.get("destino"),
        },
        "sensor": None if not tem_sensor else {
            "id_sensor": contexto["id_sensor"], "nome": contexto.get("sensor_nome"),
            "localizacao": contexto.get("localizacao"), "ambiente": contexto.get("ambiente"),
            "status": contexto.get("sensor_status"),
            "origem": leitura_atual.get("origem") if leitura_atual else None,
            "ultima_leitura": iso_utc(leitura_atual["data_hora"]) if leitura_atual else None,
            "minutos_sem_leitura": sem_leit,
            "sem_leitura": sem_leit is not None and sem_leit > SENSOR_SEM_LEITURA_MIN,
        },
        "metricas": metricas,
        "limites": None if not limites else {k: _f(v) for k, v in limites.items()},
        "leitura_gatilho": None if not leitura_gatilho else {
            "temperatura": _f(leitura_gatilho.get("temperatura")),
            "umidade": _f(leitura_gatilho.get("umidade")),
            "data_hora": iso_utc(leitura_gatilho["data_hora"]),
        },
        "serie": [{"t": iso_utc(p["data_hora"]), "temperatura": _f(p["temperatura"]),
                   "umidade": _f(p["umidade"])} for p in serie],
        "acoes": acoes_disponiveis(alerta.get("status"), tem_sensor),
    }
