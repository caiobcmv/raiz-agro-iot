from src import database


def _leitura(**extra):
    return {"entry_id": 7, "created_at": "2026-09-22T14:30:00Z", "temperatura": 27.4,
            "umidade": 61.2, **extra}


def test_insert_sem_solo_tem_as_mesmas_colunas_de_antes():
    sql, valores = database.montar_insert_leitura(_leitura(), 3)
    assert "(fk_sensor_id_sensor, entry_id_thingspeak, temperatura, umidade, data_hora, " \
           "data_recebimento, origem)" in sql
    assert valores == [3, 7, 27.4, 61.2, "2026-09-22T14:30:00Z"]
    assert sql.count("%s") == len(valores)


def test_insert_com_solo_inclui_as_colunas_e_mantem_a_ordem():
    sql, valores = database.montar_insert_leitura(
        _leitura(umidade_solo=46.8, temperatura_solo=24.1), 3)
    assert "umidade, umidade_solo, temperatura_solo, data_hora" in sql
    assert valores == [3, 7, 27.4, 61.2, 46.8, 24.1, "2026-09-22T14:30:00Z"]
    assert sql.count("%s") == len(valores)
    assert "ON CONFLICT (fk_sensor_id_sensor, entry_id_thingspeak) DO NOTHING" in sql


def test_insert_so_com_umidade_do_solo():
    sql, valores = database.montar_insert_leitura(_leitura(umidade_solo=46.8), 3)
    assert "temperatura_solo" not in sql and valores[4] == 46.8
