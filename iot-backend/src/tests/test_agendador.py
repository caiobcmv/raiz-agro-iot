import pytest

from src import agendador


@pytest.fixture(autouse=True)
def limpo(monkeypatch):
    agendador.reiniciar()
    for v in ("AGENDADOR_ATIVO", "AGENDADOR_EXECUTAR_NA_PARTIDA", "AGENDADOR_RETRY_MIN",
              "AGENDADOR_RISCO_MIN", "AGENDADOR_JANELA_MIN"):
        monkeypatch.delenv(v, raising=False)
    yield
    agendador.reiniciar()


def _tarefa(chamadas, nome, retorno=3, erro=None):
    def fn():
        chamadas.append(nome)
        if erro:
            raise erro
        return retorno
    return fn


def test_roda_na_partida_e_nao_repete_antes_do_intervalo():
    chamadas = []
    tarefas = [("risco", "AGENDADOR_RISCO_MIN", 180, _tarefa(chamadas, "risco"))]
    assert agendador.executar_pendentes(0, tarefas) == {"risco": "ok (3 registro(s))"}
    assert agendador.executar_pendentes(60, tarefas) == {}          # 1 min depois: nada
    assert agendador.executar_pendentes(180 * 60 - 1, tarefas) == {}
    assert agendador.executar_pendentes(180 * 60, tarefas) != {}    # no intervalo: roda de novo
    assert chamadas == ["risco", "risco"]


def test_nao_roda_na_partida_se_desligado(monkeypatch):
    monkeypatch.setenv("AGENDADOR_EXECUTAR_NA_PARTIDA", "false")
    chamadas = []
    tarefas = [("risco", "AGENDADOR_RISCO_MIN", 180, _tarefa(chamadas, "risco"))]
    assert agendador.executar_pendentes(0, tarefas) == {}
    assert agendador.executar_pendentes(180 * 60, tarefas) != {}


def test_falha_nao_derruba_as_outras_e_tenta_de_novo_em_15_min():
    chamadas = []

    class Erro(Exception):
        detail = "Coordenadas de referência não configuradas"

    tarefas = [
        ("risco", "AGENDADOR_RISCO_MIN", 180, _tarefa(chamadas, "risco", erro=Erro())),
        ("janela", "AGENDADOR_JANELA_MIN", 360, _tarefa(chamadas, "janela")),
    ]
    r = agendador.executar_pendentes(0, tarefas)
    assert r["risco"] == "falhou: Coordenadas de referência não configuradas"
    assert r["janela"].startswith("ok")
    assert agendador.executar_pendentes(14 * 60, tarefas) == {}      # ainda no retry
    assert "risco" in agendador.executar_pendentes(15 * 60, tarefas)  # 15 min: tenta de novo
    assert chamadas.count("risco") == 2 and chamadas.count("janela") == 1


def test_ordem_das_tarefas_e_respeitada():
    chamadas = []
    tarefas = [("a", "X_A", 10, _tarefa(chamadas, "a")), ("b", "X_B", 10, _tarefa(chamadas, "b"))]
    agendador.executar_pendentes(0, tarefas)
    assert chamadas == ["a", "b"]


def test_desligado_pelo_env(monkeypatch):
    monkeypatch.setenv("AGENDADOR_ATIVO", "false")
    chamadas = []
    tarefas = [("risco", "AGENDADOR_RISCO_MIN", 180, _tarefa(chamadas, "risco"))]
    assert agendador.executar_pendentes(0, tarefas) == {} and chamadas == []


def test_intervalo_configuravel_pelo_env(monkeypatch):
    monkeypatch.setenv("AGENDADOR_RISCO_MIN", "10")
    chamadas = []
    tarefas = [("risco", "AGENDADOR_RISCO_MIN", 180, _tarefa(chamadas, "risco"))]
    agendador.executar_pendentes(0, tarefas)
    assert agendador.executar_pendentes(10 * 60, tarefas) != {}


def test_ordem_real_tem_risco_antes_do_prejuizo():
    nomes = [t[0] for t in agendador.TAREFAS]
    assert nomes.index("risco_climatico") < nomes.index("prejuizo")


# ---------------------------------------------------------------- alertas preditivos
CORTES = [
    {"nivel": "BAIXO", "limiar_min": 0.0, "limiar_max": 0.33, "acao_recomendada": "Acompanhar"},
    {"nivel": "MEDIO", "limiar_min": 0.34, "limiar_max": 0.66, "acao_recomendada": "Reforçar a irrigação"},
    {"nivel": "CRITICO", "limiar_min": 0.67, "limiar_max": 1.0, "acao_recomendada": "Agir hoje"},
]


def test_escolher_corte_dentro_da_faixa_e_nas_frestas():
    assert agendador.escolher_corte(0.10, CORTES)["nivel"] == "BAIXO"
    assert agendador.escolher_corte(0.50, CORTES)["nivel"] == "MEDIO"
    assert agendador.escolher_corte(0.99, CORTES)["nivel"] == "CRITICO"
    assert agendador.escolher_corte(0.335, CORTES)["nivel"] == "BAIXO"   # fresta entre 0,33 e 0,34
    assert agendador.escolher_corte(0.5, []) is None


def test_mensagem_respeita_o_limite():
    m = agendador.montar_mensagem("alto", "x" * 400)
    assert len(m) <= agendador.MENSAGEM_MAX and m.endswith("…")
    assert agendador.montar_mensagem("medio", "Agir").startswith("Risco climático medio: Agir")


class _Cur:
    def __init__(self, dados, gravados):
        self.d, self.g, self._um, self._todos = dados, gravados, None, []

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, sql, params=None):
        s = " ".join(sql.split())
        self._um, self._todos = None, []
        if s.startswith("SELECT nivel, limiar_min"):
            self._todos = self.d["cortes"]
        elif "FROM risco_climatico" in s:
            self._todos = self.d["riscos"]
        elif "FROM alertas_preditivos" in s:
            self._um = {"x": 1} if (params[0], params[1].upper()) in self.d["abertos"] else None
        elif "FROM sensor" in s:
            self._um = self.d.get("sensor")
        elif s.startswith("INSERT INTO alertas_preditivos"):
            self.g.append(params)

    def fetchone(self):
        return self._um

    def fetchall(self):
        return self._todos


class _Conn:
    def __init__(self, dados):
        self.dados, self.gravados, self.commits = dados, [], 0

    def cursor(self, **kw):
        return _Cur(self.dados, self.gravados)

    def commit(self):
        self.commits += 1


def _risco(id_lote, prob, nivel="alto"):
    return {"id_lote": id_lote, "nivel_risco": nivel, "probabilidade": prob, "periodo_inicio": None}


def test_gera_preditivo_so_acima_de_baixo_e_nao_duplica():
    conn = _Conn({"cortes": CORTES, "abertos": {(2, "MEDIO")}, "sensor": {"id_sensor": 7},
                  "riscos": [_risco(1, 80.0), _risco(2, 50.0), _risco(3, 10.0), _risco(4, None)]})
    r = agendador.gerar_alertas_preditivos(conn)
    assert len(conn.gravados) == 1                    # só o lote 1 (CRITICO); o 2 já tinha, o 3 é BAIXO
    id_sensor, id_lote, prob, nivel, msg, _, = conn.gravados[0]
    assert (id_sensor, id_lote, prob, nivel) == (7, 1, 0.8, "CRITICO")   # 80 (0-100) vira 0,8
    assert "Agir hoje" in msg
    assert conn.commits == 1 and "1 criado(s), 1 já em aberto, 4 lote(s) avaliado(s)" == r


def test_sem_cortes_nao_grava_nada():
    conn = _Conn({"cortes": [], "abertos": set(), "riscos": []})
    assert "sem cortes" in agendador.gerar_alertas_preditivos(conn) and conn.gravados == []


def test_ordem_real_prejuizo_e_preditivos_depois_do_risco_e_ia_por_ultimo():
    nomes = [t[0] for t in agendador.TAREFAS]
    assert nomes.index("risco_climatico") < nomes.index("alertas_preditivos")
    assert nomes[-1] == "parecer_ia"