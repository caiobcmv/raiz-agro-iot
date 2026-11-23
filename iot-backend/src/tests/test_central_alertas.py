from datetime import datetime

from src.api.routers.central_alertas import _faixa_de, montar_codigo, normalizar_nivel


def test_normalizar_nivel_junta_os_dois_vocabularios():
    assert normalizar_nivel("alto") == "critico"      # alerta reativo (enum nivel_alerta)
    assert normalizar_nivel("CRITICO") == "critico"   # alerta preditivo
    assert normalizar_nivel("médio") == "medio"
    assert normalizar_nivel("MEDIO") == "medio"
    assert normalizar_nivel("baixo") == "baixo"
    assert normalizar_nivel(None) is None


def test_codigo_tem_prefixo_por_origem_porque_os_ids_se_repetem():
    dt = datetime(2026, 9, 22, 10, 0)
    assert montar_codigo("reativo", 1, dt) == "ALT-2026-001"
    assert montar_codigo("preditivo", 1, dt) == "PRD-2026-001"
    assert montar_codigo("preditivo", 1234, dt) == "PRD-2026-1234"


def test_faixa_transporte_cai_em_armazenamento():
    linha = {"temp_min": 10, "temp_max": 13, "umidade_min": 90, "umidade_max": 95}
    limites = {(1, "armazenamento"): linha}
    assert _faixa_de(limites, 1, "transporte")["temp_max"] == 13.0
    assert _faixa_de(limites, 1, "campo") is None
    assert _faixa_de(limites, None, "armazenamento") is None
