from datetime import datetime, timedelta, timezone

from src.api.alerta_detalhe import (acoes_disponiveis, classificar, montar_detalhe,
                                    montar_metricas, resumo, titulo_e_foco)

LIM = {"temp_min": 8.0, "temp_max": 32.0, "umidade_min": 50.0, "umidade_max": 90.0}


def test_classificar_acima_do_maximo_e_critico():
    assert classificar(34.1, 8.0, 32.0) == ("critico", 2.1)


def test_classificar_abaixo_do_minimo_desvio_negativo():
    assert classificar(45.0, 50.0, 90.0) == ("critico", -5.0)


def test_classificar_colado_no_limite_e_atencao():
    assert classificar(31.0, 8.0, 32.0)[0] == "atencao"


def test_classificar_meio_da_faixa_ok():
    assert classificar(20.0, 8.0, 32.0)[0] == "ok"


def test_sem_limite_e_sem_leitura():
    assert classificar(20.0, None, None)[0] == "sem_limite"
    assert classificar(None, 8.0, 32.0)[0] == "sem_leitura"


def test_metricas_ordenam_violacao_primeiro():
    m = montar_metricas({"temperatura": 20.0, "umidade": 40.0}, LIM)
    assert [x["chave"] for x in m] == ["umidade", "temperatura"]
    assert resumo(m) == "Umidade do ar: 40,0% — 10,0% abaixo do mínimo de 50,0%"


def test_acoes_so_com_endpoint_real():
    assert acoes_disponiveis("aberto", True) == ["reconhecer", "ver_historico"]
    assert acoes_disponiveis("reconhecido", False) == []


def test_detalhe_sem_sensor_nao_quebra():
    d = montar_detalhe({"id_alerta": 1, "status": "aberto"}, None, None, None, [])
    assert d["layout"] == "sem_leitura" and d["sensor"] is None and d["lote"] is None
    assert d["acoes"] == ["reconhecer"]


def test_detalhe_completo_e_sensor_parado():
    agora = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
    leit = {"temperatura": 34.1, "umidade": 70, "origem": "thingspeak",
            "data_hora": agora - timedelta(minutes=45)}
    ctx = {"id_sensor": 1, "sensor_nome": "S1", "localizacao": "Talhão A1", "ambiente": "ar",
           "sensor_status": "ativo", "id_lote": 12, "fruta": "Uva", "quantidade": 2000,
           "unidade": "kg", "etapa": "campo", "destino": None}
    d = montar_detalhe({"id_alerta": 1, "status": "aberto"}, ctx, LIM, leit, [], agora=agora)
    assert d["layout"] == "leitura"
    assert d["metricas"][0]["chave"] == "temperatura"
    assert d["sensor"]["sem_leitura"] is True and d["sensor"]["minutos_sem_leitura"] == 45
    assert d["lote"]["fruta"] == "Uva"


def test_titulo_e_foco_vem_do_tipo_da_trigger():
    assert titulo_e_foco("temperatura_fora_faixa") == ("Temperatura fora da faixa", "temperatura")
    assert titulo_e_foco("umidade_fora_faixa") == ("Umidade do ar fora da faixa", "umidade")
    assert titulo_e_foco("outro_tipo") == ("Outro tipo", None)


def test_foco_do_alerta_vem_primeiro_mesmo_se_ja_voltou_ao_normal():
    leit = {"temperatura": 20.0, "umidade": 40.0, "origem": "x", "data_hora": datetime.now(timezone.utc)}
    d = montar_detalhe({"id_alerta": 1, "status": "aberto", "tipo_alerta": "temperatura_fora_faixa"},
                       {"id_sensor": 1}, LIM, leit, [])
    assert d["foco"] == "temperatura" and d["metricas"][0]["chave"] == "temperatura"
