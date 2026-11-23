from src import config, thingspeak_client, validacao

FEED = {"entry_id": 14892, "created_at": "2026-09-22T14:30:00Z",
        "field1": "27.4", "field2": "61.2", "field3": "46.8", "field4": "24.1"}


def test_sem_mapear_solo_a_leitura_continua_igual(monkeypatch):
    monkeypatch.setattr(config, "TS_FIELD_UMIDADE_SOLO", None)
    monkeypatch.setattr(config, "TS_FIELD_TEMPERATURA_SOLO", None)
    leitura = thingspeak_client._montar_leitura(FEED)
    assert leitura["temperatura"] == 27.4 and leitura["umidade"] == 61.2
    assert "umidade_solo" not in leitura and "temperatura_solo" not in leitura


def test_mapeando_solo_pelos_numeros_dos_fields(monkeypatch):
    monkeypatch.setattr(config, "TS_FIELD_UMIDADE_SOLO", 3)
    monkeypatch.setattr(config, "TS_FIELD_TEMPERATURA_SOLO", 4)
    leitura = thingspeak_client._montar_leitura(FEED)
    assert leitura["umidade_solo"] == 46.8 and leitura["temperatura_solo"] == 24.1
    assert leitura["umidade_solo_bruta"] == "46.8"


def test_fields_de_ar_tambem_sao_configuraveis(monkeypatch):
    monkeypatch.setattr(config, "TS_FIELD_TEMPERATURA", 2)
    monkeypatch.setattr(config, "TS_FIELD_UMIDADE", 1)
    leitura = thingspeak_client._montar_leitura(FEED)
    assert leitura["temperatura"] == 61.2 and leitura["umidade"] == 27.4


def _base():
    return {"entry_id": 1, "created_at": "2026-09-22T14:30:00Z", "temperatura": 27.4,
            "umidade": 61.2, "temperatura_bruta": "27.4", "umidade_bruta": "61.2"}


def test_validacao_sem_campos_de_solo_nao_muda():
    assert validacao.validar_leitura(_base()) == []


def test_solo_valido_passa():
    leitura = {**_base(), "umidade_solo": 46.8, "umidade_solo_bruta": "46.8",
               "temperatura_solo": 24.1, "temperatura_solo_bruta": "24.1"}
    assert validacao.validar_leitura(leitura) == []


def test_solo_em_branco_vira_nulo_e_nao_rejeita():
    leitura = {**_base(), "umidade_solo": None, "umidade_solo_bruta": "",
               "temperatura_solo": None, "temperatura_solo_bruta": None}
    assert validacao.validar_leitura(leitura) == []


def test_solo_fora_da_faixa_ou_corrompido_rejeita_com_motivo():
    negativo = {**_base(), "umidade_solo": -4.2, "umidade_solo_bruta": "-4.2"}
    assert "umidade_solo fora da faixa válida" in validacao.validar_leitura(negativo)[0]
    texto = {**_base(), "umidade_solo": None, "umidade_solo_bruta": "abc"}
    assert "umidade_solo não numérica" in validacao.validar_leitura(texto)[0]
