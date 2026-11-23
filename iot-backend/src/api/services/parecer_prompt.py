import json

SECOES = {
    "agronomico": [
        "Identificação do lote",
        "Condições durante o cultivo e a colheita",
        "Conformidade com as faixas ideais",
        "Riscos identificados",
        "Recomendações",
    ],
    "fisiologico": [
        "Identificação do lote",
        "Estado fisiológico esperado do fruto",
        "Efeito das condições de temperatura e umidade",
        "Riscos de perda de qualidade",
        "Recomendações de manejo pós-colheita",
    ],
}

SYSTEM_PROMPT = """Você é um assistente que redige RASCUNHOS de parecer técnico \
para documentação fitossanitária de frutas exportadas.

Regras obrigatórias:
1. Use SOMENTE os dados fornecidos no JSON do usuário. Não invente valores, \
datas, normas, limites legais ou resultados de laudo.
2. Se um dado não existir ou estiver vazio (por exemplo, "faixa" nula ou \
"leituras" vazia), escreva que não há dados disponíveis. Nunca preencha com \
suposição.
3. Todo dado com origem "simulado" deve ser identificado como simulado no \
texto. Nunca o apresente como medição real.
4. Cite os números exatos recebidos (temperaturas, horas fora da faixa, \
valores). Não arredonde de forma que mude o sentido.
5. Você NÃO aprova, certifica nem atesta conformidade. Descreva o que os \
dados mostram. A decisão e a assinatura são do responsável técnico.
6. Informe o período analisado. Se "referencia.defasagem_dias" for maior que 1, \
diga que a última leitura é antiga e que o parecer não reflete as condições \
atuais.
7. Leituras "ar" são do ambiente do lote; leituras "solo" são do solo e não \
são comparadas com a faixa.
8. "vpd_medio" (kPa) já vem calculado pelo sistema. Compare com \
"vpd_limite.vpd_limite_kpa" só se esse limite existir; se "aprovado" for false, \
diga que o limite ainda não foi aprovado. Sem limite, não classifique o VPD.
9. Escreva em português do Brasil, tom técnico e objetivo. Cada seção com no \
máximo 700 caracteres.

Responda SOMENTE com JSON neste formato:
{"secoes": [{"titulo": "<titulo exato pedido>", "texto": "<texto>"}], \
"lacunas_de_dados": ["<o que faltou para um parecer completo>"]}"""


def montar_prompt_usuario(dados: dict) -> str:
    titulos = SECOES[dados["tipo"]]
    return (
        "Gere o parecer com exatamente estas seções, nesta ordem: "
        + json.dumps(titulos, ensure_ascii=False)
        + "\n\nDados do lote:\n"
        + json.dumps(dados, ensure_ascii=False, default=str)
    )


def validar_saida(saida: dict, tipo: str) -> list[dict]:
    """Confere a estrutura devolvida pela IA. Levanta ValueError se inválida."""
    esperados = SECOES[tipo]
    secoes = saida.get("secoes") if isinstance(saida, dict) else None
    if not isinstance(secoes, list) or len(secoes) != len(esperados):
        raise ValueError("Número de seções diferente do esperado")
    limpas = []
    for sec, titulo in zip(secoes, esperados):
        texto = str(sec.get("texto", "")).strip() if isinstance(sec, dict) else ""
        if not texto:
            raise ValueError(f"Seção sem texto: {titulo}")
        limpas.append({"titulo": titulo, "texto": texto})  # força o título oficial
    return limpas


def secoes_para_texto(secoes: list[dict]) -> str:
    """Junta as seções no texto único que vai para o editor da tela."""
    return "\n\n".join(f"{s['titulo']}\n{s['texto']}" for s in secoes)


# ---------- Contingência (sem IA) ----------

def _n(v, un=""):
    return "sem dado" if v is None else f"{v}{un}"


def _periodo(dados: dict) -> str:
    p = dados.get("periodo") or {}
    if not p.get("ultima_leitura"):
        return "Não há leituras de sensores registradas para este lote."
    txt = f"Período analisado: {p['inicio'][:10]} a {p['fim'][:10]} ({p['dias']} dias)."
    defas = (dados.get("referencia") or {}).get("defasagem_dias")
    if defas is not None and defas > 1:
        txt += (f" A última leitura é de {p['ultima_leitura'][:10]}, há {defas} dias; "
                "o parecer não reflete as condições atuais.")
    return txt


def _linhas_leituras(dados: dict, ambiente: str, so_horas: bool = False) -> str:
    faixa = dados.get("faixa")
    partes = []
    for l in dados.get("leituras", []):
        if l["ambiente"] != ambiente:
            continue
        rot = "dado simulado" if l["origem"] == "simulado" else "dado real"
        s = ("" if so_horas else
             f"Sensor de {ambiente} ({rot}, {l['n_leituras']} leituras): "
             f"temperatura média {_n(l['temp_media'], ' °C')} "
             f"(mín {_n(l['temp_min'])}, máx {_n(l['temp_max'])}); "
             f"umidade média {_n(l['umid_media'], ' %')}."
             + (f" VPD médio {l['vpd_medio']} kPa" +
                (f" (limite {dados['vpd_limite']['vpd_limite_kpa']} kPa)."
                 if dados.get("vpd_limite") else " (sem limite cadastrado).")
                if l.get("vpd_medio") is not None else ""))
        if ambiente == "ar" and faixa and l.get("horas_total"):
            s += (f" Sensor de ar ({rot}): horas fora da faixa ideal ({faixa['temp_min']}–{faixa['temp_max']} °C, "
                  f"{faixa['umid_min']}–{faixa['umid_max']} %): "
                  f"{l['horas_fora']} de {l['horas_total']}.")
        partes.append(s)
    return " ".join(partes)


def parecer_template(dados: dict) -> list[dict]:
    """Parecer determinístico, usado se a API de IA falhar ou estourar a cota."""
    lote = dados["lote"]
    secoes = []
    for titulo in SECOES[dados["tipo"]]:
        if titulo == "Identificação do lote":
            texto = (f"Lote {lote['id']} de {lote['fruta']}, {lote['quantidade']} "
                     f"{lote['unidade']}, destino {lote['destino']}, colhido em "
                     f"{_n(lote['data_colheita'])}. Status: {lote['status']} "
                     f"(etapa {lote['etapa']}). {_periodo(dados)}")
        elif titulo.startswith(("Condições", "Efeito", "Estado")):
            texto = (_linhas_leituras(dados, "ar") + " " + _linhas_leituras(dados, "solo")).strip() \
                or "Não há leituras disponíveis para este lote."
        elif titulo.startswith(("Conformidade", "Riscos de perda")):
            f = dados.get("faixa")
            if not f:
                texto = (f"Não há faixa ideal cadastrada para a etapa {lote['etapa']}; "
                         "a conformidade não pôde ser avaliada.")
            else:
                texto = (f"Faixa ideal da etapa {f['etapa']}: {f['temp_min']}–{f['temp_max']} °C e "
                         f"{f['umid_min']}–{f['umid_max']} % de umidade. "
                         + _linhas_leituras(dados, "ar", so_horas=True))
        elif titulo.startswith("Riscos"):
            ps = []
            for tipo, p in (dados.get("previsoes") or {}).items():
                ps.append(f"{tipo}: categoria {_n(p.get('categoria'))}, "
                          f"valor {_n(p.get('valor'))} {p.get('unidade') or ''}".strip())
            al = dados.get("alertas") or {"total": 0}
            texto = ("; ".join(ps) + ". " if ps else "Sem previsões registradas. ") \
                + f"Alertas no período: {al['total']}."
        else:
            texto = "Recomendações a serem definidas pelo responsável técnico."
        secoes.append({"titulo": titulo, "texto": texto})
    return secoes